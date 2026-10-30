"""The welcome email with login details: sent when HR adds an employee, and again (with a new
temporary password) when HR asks. Only a password hash is stored, so a resend always sets a new
temporary password; the employee must replace it at their next sign-in."""

import uuid

from sqlmodel import Session

from app.core.config import get_settings
from app.core.security import generate_temporary_password, hash_password
from app.models.enums import EmailKind, EmailStatus
from app.models.user import Employee
from app.services.email_templates import welcome_email
from app.services.employee import EmployeeNotFoundError
from app.services.mail import deliver


class AccountInactiveError(Exception):
    """The account is deactivated; reactivate it before sending login details."""


class OwnAccountError(Exception):
    """HR asked to reset their own password this way; they use Change password instead."""


def send_welcome_email(session: Session, employee: Employee, temporary_password: str) -> EmailStatus:
    settings = get_settings()
    subject, text, html = welcome_email(
        name=employee.name,
        email=employee.email,
        temporary_password=temporary_password,
        app_url=settings.app_url,
        can_reply=settings.mail_reply_to is not None,
    )
    return deliver(
        session,
        kind=EmailKind.WELCOME,
        to=employee.email,
        subject=subject,
        text=text,
        html=html,
        employee_id=employee.id,
    )


def resend_welcome_email(
    session: Session, employee_id: uuid.UUID, requested_by: Employee
) -> tuple[EmailStatus, str]:
    """Set a new temporary password, email it, and return (email status, password)."""
    employee = session.get(Employee, employee_id)
    if employee is None:
        raise EmployeeNotFoundError(employee_id)
    if employee.id == requested_by.id:
        raise OwnAccountError
    if not employee.is_active:
        raise AccountInactiveError

    password = generate_temporary_password()
    employee.password_hash = hash_password(password)
    employee.must_change_password = True
    session.add(employee)
    session.commit()
    session.refresh(employee)
    return send_welcome_email(session, employee, password), password
