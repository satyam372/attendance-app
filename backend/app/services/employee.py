"""Creating employees. Used by the HR "add employee" route and scripts/seed.py."""

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.core.security import hash_password
from app.models.user import Employee, EmployeeCreate


class EmailAlreadyExistsError(Exception):
    """Another employee already uses this email."""


class ManagerNotFoundError(Exception):
    """reports_to_id does not point to an active employee."""


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
