"""Check-in, check-out and the monthly WFH count.

`now` is a parameter (default: the real time) so tests can pretend it is 11:30 or a Saturday.
"""

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.time import is_late, is_weekend, punctuality, to_office_time
from app.models.attendance import Attendance, AttendancePublic
from app.models.enums import ApprovalStatus, DayStatus, LeavePortion, WorkMode
from app.models.holiday import Holiday
from app.models.request import Request
from app.models.user import Employee
from app.schemas.attendance import AttendanceDay, TodayStatus
from app.services.holiday import holiday_dates_between, holidays_between, is_working_day


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

    # A row from an approved request (or an HR correction) already decided today's mode,
    # so the WFH limit does not apply
    if row is not None and row.work_mode is not None and (
        row.request_id is not None or row.updated_by_id is not None
    ):
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


def _day_status(
    row: Attendance | None,
    closed_holiday: Holiday | None,
    request_status: ApprovalStatus | None,
    day: date,
    today: date,
) -> DayStatus:
    if row is not None:
        if row.leave_portion == LeavePortion.FULL:
            return DayStatus.LEAVE
        if row.leave_portion == LeavePortion.HALF:
            return DayStatus.HALF_DAY_LEAVE
        if row.work_mode is not None:
            return DayStatus(row.work_mode.value)  # OFFICE, WFH or HYBRID
    if closed_holiday is not None:
        return DayStatus.HOLIDAY
    # Request status is never stored in attendance; it is derived here (CLAUDE.md)
    if request_status == ApprovalStatus.PENDING:
        return DayStatus.AWAITING_APPROVAL
    if request_status == ApprovalStatus.REJECTED:
        return DayStatus.REJECTED
    return DayStatus.NOT_CHECKED_IN if day == today else DayStatus.ABSENT


def _open_request_status_by_day(
    session: Session, employee_id: uuid.UUID, first: date, last: date
) -> dict[date, ApprovalStatus]:
    """PENDING or REJECTED request status per day in [first, last]. PENDING wins over REJECTED
    when both cover a day (the employee asked again after a rejection)."""
    requests = session.exec(
        select(Request).where(
            Request.employee_id == employee_id,
            Request.status.in_([ApprovalStatus.PENDING, ApprovalStatus.REJECTED]),
            Request.from_date <= last,
            Request.to_date >= first,
        )
    ).all()
    by_day: dict[date, ApprovalStatus] = {}
    for request in requests:
        day = max(request.from_date, first)
        while day <= min(request.to_date, last):
            if by_day.get(day) != ApprovalStatus.PENDING:
                by_day[day] = request.status
            day += timedelta(days=1)
    return by_day


def get_month_history(
    session: Session, employee: Employee, year: int, month: int, now: datetime | None = None
) -> list[AttendanceDay]:
    """One entry per day of the month up to today, newest first.

    Weekends appear only if the employee worked; holidays always appear. Days before the
    employee was created are left out, so a new joiner is not shown as absent.
    """
    today = to_office_time(_now(now)).date()
    start, end = _month_bounds(year, month)
    joined = to_office_time(employee.created_at).date() if employee.created_at else start
    first = max(start, joined)
    last = min(end - timedelta(days=1), today)
    if first > last:
        return []

    rows = session.exec(
        select(Attendance).where(
            Attendance.employee_id == employee.id,
            Attendance.work_date >= first,
            Attendance.work_date <= last,
        )
    ).all()
    rows_by_date = {row.work_date: row for row in rows}
    holidays = holidays_between(session, first, last + timedelta(days=1))
    request_status = _open_request_status_by_day(session, employee.id, first, last)

    days: list[AttendanceDay] = []
    day = last
    while day >= first:
        row = rows_by_date.get(day)
        holiday = holidays.get(day)
        closed_holiday = holiday if holiday is not None and not holiday.is_optional else None
        if row is None and is_weekend(day):
            day -= timedelta(days=1)
            continue

        # Optional holidays are working days: the office is open
        working_day = not is_weekend(day) and closed_holiday is None
        in_time = row.in_time if row else None
        out_time = row.out_time if row else None
        days.append(
            AttendanceDay(
                work_date=day,
                status=_day_status(
                    row, closed_holiday, request_status.get(day) if working_day else None, day, today
                ),
                holiday_name=holiday.name if holiday else None,
                in_time=in_time,
                out_time=out_time,
                worked_minutes=int((out_time - in_time).total_seconds() // 60)
                if in_time and out_time
                else None,
                punctuality=punctuality(
                    in_time,
                    row.leave_portion if row else LeavePortion.NONE,
                    working_day=working_day,
                ),
            )
        )
        day -= timedelta(days=1)
    return days


def to_public(session: Session, row: Attendance) -> AttendancePublic:
    """Response shape with is_late filled in (it needs the holiday table, so it lives here)."""
    late = is_late(row.in_time, row.leave_portion, working_day=is_working_day(session, row.work_date))
    return AttendancePublic.model_validate(row, update={"is_late": late})
