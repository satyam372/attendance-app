import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlmodel import Field, SQLModel

from app.models.base import TimestampMixin
from app.models.enums import LeaveHalf, LeavePortion, WorkMode


class AttendanceBase(SQLModel):
    """What happened on one day for one employee. Shown in history tables, editable by HR."""

    work_date: date = Field(index=True)  # Pune date, not UTC
    work_mode: WorkMode | None = Field(default=None)  # empty only on a full leave day
    leave_portion: LeavePortion = Field(default=LeavePortion.NONE)
    leave_half: LeaveHalf | None = Field(default=None)  # only when leave_portion is HALF
    in_time: datetime | None = Field(default=None)  # UTC
    out_time: datetime | None = Field(default=None)  # UTC


class Attendance(AttendanceBase, TimestampMixin, table=True):
    """One row per employee per day. The rules from docs/schema.md are enforced by Postgres."""

    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("employee_id", "work_date", name="uq_attendance_employee_day"),
        CheckConstraint(
            "(leave_portion = 'HALF') = (leave_half IS NOT NULL)",
            name="ck_attendance_leave_half",
        ),
        CheckConstraint(
            "(leave_portion = 'FULL') = (work_mode IS NULL)",
            name="ck_attendance_work_mode",
        ),
        CheckConstraint(
            "out_time IS NULL OR (in_time IS NOT NULL AND out_time > in_time)",
            name="ck_attendance_out_after_in",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    employee_id: uuid.UUID = Field(foreign_key="employee.id", index=True)
    # TODO: add request_id (FK to request.id) together with models/request.py
    updated_by_id: uuid.UUID | None = Field(default=None, foreign_key="employee.id")


class AttendancePublic(AttendanceBase):
    """Response shape for history tables and the HR sheet."""

    id: uuid.UUID
    employee_id: uuid.UUID
    # Calculated, never stored. Filled in by the attendance service with core.time.is_late,
    # because knowing whether the day is a holiday needs a database lookup.
    is_late: bool | None = None


class AttendanceUpdate(SQLModel):
    """HR correction (PATCH): send only the fields to change."""

    work_mode: WorkMode | None = None
    leave_portion: LeavePortion | None = None
    leave_half: LeaveHalf | None = None
    in_time: datetime | None = None
    out_time: datetime | None = None
