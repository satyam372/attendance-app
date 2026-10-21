"""Creating, listing and deactivating employees. Used by the HR routes and scripts/seed.py."""

import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.core.security import hash_password
from app.models.user import Employee, EmployeeCreate


class EmailAlreadyExistsError(Exception):
    """Another employee already uses this email."""


class ManagerNotFoundError(Exception):
    """reports_to_id does not point to an active employee."""


class EmployeeNotFoundError(Exception):
    """No employee with this id."""


class CannotDeactivateSelfError(Exception):
    """HR tried to deactivate their own account, which could leave nobody able to undo it."""


def list_employees(session: Session) -> list[Employee]:
    """Everyone, active and inactive, sorted by name (HR Team tab)."""
    return list(session.exec(select(Employee).order_by(Employee.name)).all())


def create_employee(session: Session, data: EmployeeCreate) -> Employee:
    # data.email is already lowercase (EmployeeBase validator)
    if session.exec(select(Employee).where(Employee.email == data.email)).first():
        raise EmailAlreadyExistsError(data.email)

    if data.reports_to_id is not None:
        manager = session.get(Employee, data.reports_to_id)
        if manager is None or not manager.is_active:
            raise ManagerNotFoundError(data.reports_to_id)

    employee = Employee.model_validate(
        data,
        update={"password_hash": hash_password(data.password), "must_change_password": True},
    )
    session.add(employee)
    try:
        session.commit()
    except IntegrityError as exc:
        # Two requests with the same email at once: the unique index catches the second
        session.rollback()
        raise EmailAlreadyExistsError(data.email) from exc
    session.refresh(employee)
    return employee


def set_employee_active(
    session: Session, employee_id: uuid.UUID, is_active: bool, changed_by: Employee
) -> Employee:
    """Deactivate (False) or restore (True) an employee. Soft delete: the row and its history stay.
    get_current_user rejects inactive employees, so their session stops working on the next request."""
    employee = session.get(Employee, employee_id)
    if employee is None:
        raise EmployeeNotFoundError(employee_id)
    if employee.id == changed_by.id and not is_active:
        raise CannotDeactivateSelfError
    employee.is_active = is_active
    session.add(employee)
    session.commit()
    session.refresh(employee)
    return employee
