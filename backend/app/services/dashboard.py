"""HR dashboard: who is where on a given day.

get_team_day classifies each person once; get_day_summary counts those same statuses, so the
cards and the "Team today" list can never disagree.
"""

from datetime import date, datetime, time

from sqlmodel import Session, select

from app.core.time import is_weekend, office_today, office_tz, punctuality
from app.models.attendance import Attendance
from app.models.enums import DayStatus, LeavePortion, Punctuality
from app.models.user import Employee
from app.schemas.dashboard import DaySummary, TeamMemberDay
from app.services.holiday import is_working_day


def _active_team(session: Session, day: date) -> list[Employee]:
    """Active employees who had joined by the end of `day` (Pune time), sorted by name."""
    end_of_day = datetime.combine(day, time.max, tzinfo=office_tz())
    return list(
        session.exec(
            select(Employee)
            .where(Employee.is_active == True, Employee.created_at <= end_of_day)
            .order_by(Employee.name)
        ).all()
    )


def _status(row: Attendance | None, working_day: bool, day: date, today: date) -> DayStatus:
    if row is not None:
        if row.leave_portion == LeavePortion.FULL:
            return DayStatus.LEAVE
        if row.leave_portion == LeavePortion.HALF:
            return DayStatus.HALF_DAY_LEAVE
        # Counted as working only once checked in; an approved WFH without a check-in is not
        if row.in_time is not None and row.work_mode is not None:
            return DayStatus(row.work_mode.value)  # OFFICE, WFH or HYBRID
    if not working_day:
        return DayStatus.WEEKEND if is_weekend(day) else DayStatus.HOLIDAY
    return DayStatus.NOT_CHECKED_IN if day == today else DayStatus.ABSENT


def get_team_day(session: Session, day: date) -> list[TeamMemberDay]:
    """One entry per active employee for `day`, sorted by name ("Team today")."""
    team = _active_team(session, day)
    rows = session.exec(select(Attendance).where(Attendance.work_date == day)).all()
    rows_by_employee = {row.employee_id: row for row in rows}
    working_day = is_working_day(session, day)
    today = office_today()

    members = []
    for employee in team:
        row = rows_by_employee.get(employee.id)
        members.append(
            TeamMemberDay(
                employee_id=employee.id,
                name=employee.name,
                status=_status(row, working_day, day, today),
                work_mode=row.work_mode if row else None,
                leave_half=row.leave_half if row else None,
                in_time=row.in_time if row else None,
                out_time=row.out_time if row else None,
                punctuality=punctuality(
                    row.in_time if row else None,
                    row.leave_portion if row else LeavePortion.NONE,
                    working_day=working_day,
                ),
                attendance_id=row.id if row else None,
            )
        )
    return members


_BUCKETS = {
    DayStatus.OFFICE: "in_office",
    DayStatus.WFH: "wfh",
    DayStatus.HYBRID: "hybrid",
    DayStatus.LEAVE: "on_leave",
    DayStatus.HALF_DAY_LEAVE: "half_day_leave",
}


def get_day_summary(session: Session, day: date) -> DaySummary:
    """The four "Today" cards, counted from get_team_day."""
    members = get_team_day(session, day)
    counts = {bucket: 0 for bucket in _BUCKETS.values()}
    for member in members:
        bucket = _BUCKETS.get(member.status)
        if bucket is not None:
            counts[bucket] += 1

    return DaySummary(
        work_date=day,
        is_working_day=is_working_day(session, day),
        team_size=len(members),
        not_checked_in=len(members) - sum(counts.values()),
        late=sum(1 for member in members if member.punctuality == Punctuality.LATE),
        **counts,
    )
