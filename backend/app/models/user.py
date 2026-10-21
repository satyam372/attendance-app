import uuid
from datetime import datetime

from pydantic import EmailStr, field_validator
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


class EmployeeCreate(EmployeeBase):
    """Request body when HR adds an employee. The route hashes `password` into password_hash."""

    # Shared policy with change-password: 8+ characters, at most 72 bytes (bcrypt limit)
    password: NewPassword


class EmployeePublic(EmployeeBase):
    """Response shape for an employee. No password_hash."""

    id: uuid.UUID
    must_change_password: bool
    created_at: datetime


class EmployeeStatusUpdate(SQLModel):
    """Body of PATCH /api/employees/{id}: false deactivates the employee, true restores them."""

    is_active: bool
