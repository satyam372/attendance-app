import uuid
from datetime import datetime
from typing import Self

from pydantic import EmailStr, field_validator, model_validator
from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.models.base import TimestampMixin
from app.models.enums import Role
from app.schemas.password import NewPassword


class EmployeeBase(SQLModel):
    """Fields that are safe to accept from HR and to return from the API."""

    name: str = Field(min_length=1, max_length=100)
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    role: Role = Field(default=Role.EMPLOYEE)
    reports_to_id: uuid.UUID | None = Field(default=None, foreign_key="employee.id")
    is_active: bool = Field(default=True)

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, value: str) -> str:
        # Runs for EmployeeCreate and Employee.model_validate(); plain Employee(...) skips it
        return value.lower()


class Employee(EmployeeBase, TimestampMixin, table=True):
    """The employee table. Never return this class from a route: it has password_hash."""

    __tablename__ = "employee"

    # Generated in Python, so the id is known before the INSERT
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    password_hash: str = Field(max_length=255)
    must_change_password: bool = Field(default=True)
    # When the profile photo last changed; null without a photo. Part of the photo URL
    # (?v=...), so browsers can cache a photo for good and still see a new one at once.
    photo_updated_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))


class EmployeeCreate(EmployeeBase):
    """Request body when HR adds an employee. The route hashes `password` into password_hash."""

    # Shared policy with change-password: 8+ characters, at most 72 bytes (bcrypt limit)
    password: NewPassword


class EmployeePublic(EmployeeBase):
    """Response shape for an employee. No password_hash."""

    id: uuid.UUID
    must_change_password: bool
    created_at: datetime
    photo_updated_at: datetime | None = None


class EmployeeUpdate(SQLModel):
    """Body of PATCH /api/employees/{id}. Send only the fields to change:
    {"is_active": false} deactivates, {"reports_to_id": "<manager id>"} changes the manager,
    {"reports_to_id": null} removes it."""

    is_active: bool | None = None
    reports_to_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def check_fields(self) -> Self:
        # model_fields_set = the keys the client actually sent, so a missing key and an
        # explicit null can be told apart (null is meaningful for reports_to_id only)
        if not self.model_fields_set:
            raise ValueError("Send is_active or reports_to_id")
        if "is_active" in self.model_fields_set and self.is_active is None:
            raise ValueError("is_active cannot be null")
        return self
