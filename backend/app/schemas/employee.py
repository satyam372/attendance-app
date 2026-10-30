"""Request and response shapes for HR's employee routes that are not plain table models."""

from sqlmodel import SQLModel

from app.models.enums import EmailStatus
from app.models.user import EmployeeCreate, EmployeePublic


class EmployeeCreateRequest(EmployeeCreate):
    """Body of POST /api/employees: the new account, and whether to email the login details."""

    send_welcome_email: bool = True


class EmployeeCreated(EmployeePublic):
    """Response of POST /api/employees. welcome_email is null when no email was asked for."""

    welcome_email: EmailStatus | None = None


class WelcomeEmailResult(SQLModel):
    """Response of POST /api/employees/{id}/welcome-email. The new temporary password is returned
    too, so HR can still share it by hand when the email was not sent."""

    welcome_email: EmailStatus
    temporary_password: str
