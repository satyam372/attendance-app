"""HR dashboard response shapes."""

import uuid
from datetime import date, datetime

from sqlmodel import SQLModel

from app.models.enums import DayStatus, LeaveHalf, Punctuality, WorkMode


class DaySummary(SQLModel):
    """Counts for the HR "Today" cards. Every active employee is in exactly one bucket, so
    in_office + wfh + hybrid + on_leave + half_day_leave + not_checked_in == team_size."""

    work_date: date
    is_working_day: bool  # False on weekends and closed holidays (holiday banner)
    team_size: int  # active employees who had joined by work_date
    in_office: int  # checked in, OFFICE
    wfh: int  # checked in, WFH
    hybrid: int  # checked in, HYBRID (approved half WFH)
    on_leave: int  # approved full-day leave
    half_day_leave: int  # approved half-day leave (checked in for the other half or not)
    not_checked_in: int  # everyone else
    late: int  # checked-in employees marked LATE (any work mode); a subset, not a bucket


class TeamMemberDay(SQLModel):
    """One card in "Team today". Same classification as DaySummary, per person."""

    employee_id: uuid.UUID
    name: str
    photo_updated_at: datetime | None = None  # null without a photo; the frontend builds the URL
    status: DayStatus  # OFFICE, WFH, HYBRID, LEAVE, HALF_DAY_LEAVE, HOLIDAY, WEEKEND,
    #                    NOT_CHECKED_IN (today) or ABSENT (past day)
    work_mode: WorkMode | None = None  # e.g. an approved WFH that is not checked in yet
    leave_half: LeaveHalf | None = None  # which half, on a half-day leave
    in_time: datetime | None = None  # UTC
    out_time: datetime | None = None
    punctuality: Punctuality | None = None
    attendance_id: uuid.UUID | None = None  # the row HR corrects; None when there is no row
