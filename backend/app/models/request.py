"""Leave and WFH requests: what was asked for and the decision.

Attendance stays "what happened"; approval lives only here (see docs/schema.md).
"""

import uuid
from datetime import date, datetime
from typing import Self

from pydantic import model_validator
from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel

from app.models.base import TimestampMixin
from app.models.enums import ApprovalStatus, LeaveCategory, LeaveHalf, RequestType

LEAVE_TYPES = {RequestType.FULL_LEAVE, RequestType.HALF_DAY_LEAVE, RequestType.HALF_LEAVE_HALF_WFH}
HALF_DAY_TYPES = {RequestType.HALF_DAY_LEAVE, RequestType.HALF_LEAVE_HALF_WFH}


class RequestBase(SQLModel):
    """What the employee asks for. The combination rules run for RequestCreate and for
    Request.model_validate(); the same rules are also CHECK constraints in Postgres."""

    request_type: RequestType
    from_date: date
    to_date: date
    leave_half: LeaveHalf | None = Field(default=None)  # half-day leave types only
    leave_category: LeaveCategory | None = Field(default=None)  # leave types only
    holiday_id: uuid.UUID | None = Field(default=None, foreign_key="holiday.id")  # optional holiday
    reason: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def check_combination(self) -> Self:
        if self.to_date < self.from_date:
            raise ValueError("to_date must be on or after from_date")

        is_leave = self.request_type in LEAVE_TYPES
        is_half_day = self.request_type in HALF_DAY_TYPES

        if is_half_day:
            if self.leave_half is None:
                raise ValueError("leave_half is required for half-day requests")
            if self.from_date != self.to_date:
                raise ValueError("A half-day request covers a single date")
        elif self.leave_half is not None:
            raise ValueError("leave_half is only for half-day leave")

        if is_leave and self.leave_category is None:
            raise ValueError("leave_category is required for leave requests")
        if not is_leave and self.leave_category is not None:
            raise ValueError("WFH requests have no leave_category")

        if self.leave_category == LeaveCategory.OPTIONAL_HOLIDAY:
            if self.request_type != RequestType.FULL_LEAVE or self.holiday_id is None:
                raise ValueError("An optional holiday is a FULL_LEAVE request with holiday_id")
            if self.from_date != self.to_date:
                raise ValueError("An optional holiday covers a single date")
        elif self.holiday_id is not None:
            raise ValueError("holiday_id is only for leave_category OPTIONAL_HOLIDAY")
        return self


class Request(RequestBase, TimestampMixin, table=True):
    """created_at (from the mixin) is the "applied on" time for the 1-day-advance rule."""

    __tablename__ = "request"
    __table_args__ = (
        CheckConstraint("to_date >= from_date", name="ck_request_dates"),
        CheckConstraint(
            "(request_type IN ('HALF_DAY_LEAVE', 'HALF_LEAVE_HALF_WFH')) = (leave_half IS NOT NULL)",
            name="ck_request_leave_half",
        ),
        CheckConstraint(
            "(request_type IN ('FULL_LEAVE', 'HALF_DAY_LEAVE', 'HALF_LEAVE_HALF_WFH'))"
            " = (leave_category IS NOT NULL)",
            name="ck_request_leave_category",
        ),
        CheckConstraint(
            "(leave_category IS NOT NULL AND leave_category = 'OPTIONAL_HOLIDAY')"
            " = (holiday_id IS NOT NULL)",
            name="ck_request_holiday",
        ),
        # Decided requests have who and when; pending ones have neither
        CheckConstraint(
            "(status = 'PENDING') = (decided_at IS NULL AND decided_by_id IS NULL)",
            name="ck_request_decision",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    employee_id: uuid.UUID = Field(foreign_key="employee.id", index=True)
    status: ApprovalStatus = Field(default=ApprovalStatus.PENDING, index=True)
    decided_by_id: uuid.UUID | None = Field(default=None, foreign_key="employee.id")
    decided_at: datetime | None = Field(default=None)


class RequestCreate(RequestBase):
    """Body when an employee raises a request. employee_id and status are set by the server."""


class RequestPublic(RequestBase):
    """Response shape for the employee's own requests and HR's request list."""

    id: uuid.UUID
    employee_id: uuid.UUID
    status: ApprovalStatus
    decided_by_id: uuid.UUID | None
    decided_at: datetime | None
    created_at: datetime
    # Filled in by services/request.py, not stored: "Waiting for Rohan" / "Approved by Rohan".
    # approver_name is who may decide it now: the requester's manager, or "HR".
    approver_name: str
    decided_by_name: str | None = None
