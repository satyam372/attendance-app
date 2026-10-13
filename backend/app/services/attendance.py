"""Check-in, check-out and the monthly WFH count.

`now` is a parameter (default: the real time) so tests can pretend it is 11:30 or a Saturday.
"""

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.time import is_late, is_weekend, to_office_time
from app.models.attendance import Attendance, AttendancePublic
from app.models.enums import LeavePortion, WorkMode
from app.models.user import Employee
from app.schemas.attendance import TodayStatus
from app.services.holiday import holiday_dates_between, is_working_day


class AttendanceError(Exception):
    """Base class. The route maps each subclass to a status code."""


class AlreadyCheckedInError(AttendanceError):
    """There is already an in_time for today."""


class OnLeaveError(AttendanceError):
    """Today is an approved full-day leave."""


class WfhLimitReachedError(AttendanceError):
    """Free WFH days for this month are used up; the employee must raise a WFH request."""


class NotCheckedInError(AttendanceError):
    """Check-out without an open check-in."""


class AlreadyCheckedOutError(AttendanceError):
    """There is already an out_time for this check-in."""


def _now(now: datetime | None) -> datetime:
    return now if now is not None else datetime.now(UTC)


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    """[first day of month, first day of next month)"""
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


def get_day_row(session: Session, employee_id: uuid.UUID, day: date) -> Attendance | None:
    return session.exec(
        select(Attendance).where(Attendance.employee_id == employee_id, Attendance.work_date == day)
    ).first()


def count_wfh_used(session: Session, employee_id: uuid.UUID, year: int, month: int) -> float:
    """WFH used in a month on working days: full WFH = 1, HYBRID = 0.5, half leave + WFH = 0.5.

    Weekends and holidays never count (see Business rules in CLAUDE.md).
    """
    start, end = _month_bounds(year, month)
    rows = session.exec(
        select(Attendance).where(
            Attendance.employee_id == employee_id,
            Attendance.work_date >= start,
            Attendance.work_date < end,
            Attendance.work_mode.in_([WorkMode.WFH, WorkMode.HYBRID]),
        )
    ).all()
    holidays = holiday_dates_between(session, start, end)

    used = 0.0
    for row in rows:
        if is_weekend(row.work_date) or row.work_date in holidays:
            continue
        if row.work_mode == WorkMode.HYBRID or row.leave_portion == LeavePortion.HALF:
            used += 0.5
        else:
            used += 1
    return used


def check_in(
    session: Session, employee: Employee, work_mode: WorkMode, now: datetime | None = None
) -> Attendance:
    now = _now(now)
    today = to_office_time(now).date()  # Pune date, not the server's UTC date
    row = get_day_row(session, employee.id, today)

    if row is not None:
        if row.in_time is not None:
            raise AlreadyCheckedInError
        if row.leave_portion == LeavePortion.FULL:
            raise OnLeaveError

    # A row that exists before check-in was made by an approved request (or HR), so it
    # already decided today's mode and the WFH limit does not apply
    if row is not None and row.work_mode is not None:
        work_mode = row.work_mode
    elif work_mode == WorkMode.WFH and is_working_day(session, today):
        used = count_wfh_used(session, employee.id, today.year, today.month)
        if used >= get_settings().wfh_free_days_per_month:
            raise WfhLimitReachedError

    if row is None:
        row = Attendance(employee_id=employee.id, work_date=today)
    row.work_mode = work_mode
    row.in_time = now

    session.add(row)
    try:
        session.commit()
    except IntegrityError as exc:
        # Double click: two check-ins for the same day, the unique constraint stops the second
        session.rollback()
        raise AlreadyCheckedInError from exc
    session.refresh(row)
    return row


def check_out(session: Session, employee: Employee, now: datetime | None = None) -> Attendance:
    now = _now(now)
    local_now = to_office_time(now)
    today = local_now.date()

    # Late-night check-ins are allowed, so a check-out after midnight but before the office
    # opens closes yesterday's row. Later in the day a forgotten row stays open for HR to fix.
    row = get_day_row(session, employee.id, today)
    early_morning = local_now.time() < get_settings().office_start
    if (row is None or row.in_time is None) and early_morning:
        yesterday = get_day_row(session, employee.id, today - timedelta(days=1))
        if yesterday is not None and yesterday.in_time is not None and yesterday.out_time is None:
            row = yesterday

    if row is None or row.in_time is None:
        raise NotCheckedInError
    if row.out_time is not None:
        raise AlreadyCheckedOutError

    row.out_time = now
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def get_today_status(session: Session, employee: Employee, now: datetime | None = None) -> TodayStatus:
    """Everything the employee home screen needs: today's row, WFH used, working day."""
    today = to_office_time(_now(now)).date()
    row = get_day_row(session, employee.id, today)
    return TodayStatus(
        work_date=today,
        attendance=to_public(session, row) if row is not None else None,
        wfh_used=count_wfh_used(session, employee.id, today.year, today.month),
        wfh_free=get_settings().wfh_free_days_per_month,
        is_working_day=is_working_day(session, today),
    )


def to_public(session: Session, row: Attendance) -> AttendancePublic:
    """Response shape with is_late filled in (it needs the holiday table, so it lives here)."""
    late = is_late(row.in_time, row.leave_portion, working_day=is_working_day(session, row.work_date))
    return AttendancePublic.model_validate(row, update={"is_late": late})
