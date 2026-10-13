"""Import every table model here so SQLModel.metadata (used by Alembic) sees all tables."""

from app.models.attendance import Attendance
from app.models.holiday import Holiday
from app.models.user import Employee

__all__ = ["Attendance", "Employee", "Holiday"]
