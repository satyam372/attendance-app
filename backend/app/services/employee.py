"""Creating, listing and updating employees (status, manager). Used by the HR routes and
scripts/seed.py."""

import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.core.security import hash_password
from app.models.enums import Role
from app.models.user import Employee, EmployeeCreate, EmployeeUpdate


class EmailAlreadyExistsError(Exception):
    """Another employee already uses this email."""


class ManagerNotFoundError(Exception):
    """reports_to_id does not point to an active MANAGER."""


class InvalidManagerError(Exception):
    """The new manager is the employee themselves, or someone who (indirectly) reports to them."""


class EmployeeNotFoundError(Exception):
    """No employee with this id."""


class CannotDeactivateSelfError(Exception):
    """HR tried to deactivate their own account, which could leave nobody able to undo it."""


class ManagerHasTeamError(Exception):
    """A manager with active direct reports cannot be deactivated: their reports' requests would
    have nobody to decide them except HR."""

    def __init__(self, manager: Employee) -> None:
        super().__init__(manager.name)
        self.manager_name = manager.name


def list_employees(session: Session) -> list[Employee]:
    """Everyone, active and inactive, sorted by name (HR Team tab)."""
    return list(session.exec(select(Employee).order_by(Employee.name)).all())


def create_employee(session: Session, data: EmployeeCreate) -> Employee:
    # data.email is already lowercase (EmployeeBase validator)
    if session.exec(select(Employee).where(Employee.email == data.email)).first():
        raise EmailAlreadyExistsError(data.email)

    if data.reports_to_id is not None:
        _check_manager(session, data.reports_to_id)

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


def _check_manager(session: Session, manager_id: uuid.UUID) -> Employee:
    """reports_to_id must point to an active MANAGER: only managers decide their reports'
    requests (services/request.can_decide)."""
    manager = session.get(Employee, manager_id)
    if manager is None or not manager.is_active or manager.role != Role.MANAGER:
        raise ManagerNotFoundError(manager_id)
    return manager


def _reports_to_chain(session: Session, manager: Employee) -> set[uuid.UUID]:
    """The manager plus everyone above them. Stops on a repeat, so bad data cannot loop forever."""
    chain: set[uuid.UUID] = set()
    current: Employee | None = manager
    while current is not None and current.id not in chain:
        chain.add(current.id)
        current = session.get(Employee, current.reports_to_id) if current.reports_to_id else None
    return chain


def update_employee(
    session: Session, employee_id: uuid.UUID, data: EmployeeUpdate, changed_by: Employee
) -> Employee:
    """Apply only the fields the client sent. Deactivation is a soft delete: the row and its
    history stay, and get_current_user rejects the employee from their next request on."""
    employee = session.get(Employee, employee_id)
    if employee is None:
        raise EmployeeNotFoundError(employee_id)
    changes = data.model_dump(exclude_unset=True)

    if changes.get("reports_to_id") is not None:
        manager = _check_manager(session, changes["reports_to_id"])
        # Self-reference or a loop (A -> B -> A): the employee would sit above their own manager
        if employee.id in _reports_to_chain(session, manager):
            raise InvalidManagerError(manager.id)

    if changes.get("is_active") is False:
        if employee.id == changed_by.id:
            raise CannotDeactivateSelfError
        has_team = session.exec(
            select(Employee.id).where(
                Employee.reports_to_id == employee.id, Employee.is_active == True
            )
        ).first()
        if has_team is not None:
            raise ManagerHasTeamError(employee)

    employee.sqlmodel_update(changes)
    session.add(employee)
    session.commit()
    session.refresh(employee)
    return employee
