"""Attendance request/response shapes that are not built from the table's Base.
(AttendancePublic and AttendanceUpdate live next to the table in models/attendance.py.)"""

from datetime import date

from pydantic import field_validator
from sqlmodel import SQLModel

from app.models.attendance import AttendancePublic
from app.models.enums import WorkMode


class CheckInRequest(SQLModel):
    """Body of POST /api/attendance/check-in. Date and time are set by the server."""

    work_mode: WorkMode

    @field_validator("work_mode")
    @classmethod
    def office_or_home(cls, value: WorkMode) -> WorkMode:
        # HYBRID only comes from an approved half-WFH request, not from the check-in selector
        if value == WorkMode.HYBRID:
            raise ValueError("Choose OFFICE or WFH")
        return value


class TodayStatus(SQLModel):
    """Response of GET /api/attendance/today: everything the employee home screen needs."""

    work_date: date  # Pune date, so the frontend never works it out from the browser clock
    attendance: AttendancePublic | None  # None = not checked in and no approved row today
    wfh_used: float  # this month, working days only
    wfh_free: int  # WFH_FREE_DAYS_PER_MONTH, so the frontend does not hard-code 2
    is_working_day: bool  # False on weekends and holidays (holiday banner, no late tag)
