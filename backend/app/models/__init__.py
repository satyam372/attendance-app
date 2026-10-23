"""Import every table model here so SQLModel.metadata (used by Alembic) sees all tables."""

from app.models.attendance import Attendance
from app.models.email_log import EmailLog
from app.models.holiday import Holiday
from app.models.request import Request
from app.models.user import Employee

__all__ = ["Attendance", "EmailLog", "Employee", "Holiday", "Request"]
