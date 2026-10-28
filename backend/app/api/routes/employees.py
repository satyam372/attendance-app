import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import SessionDep
from app.core.deps import CurrentUserDep, require_role
from app.models.enums import Role
from app.models.user import (
    Employee,
    EmployeeCreate,
    EmployeePublic,
    EmployeeStatusUpdate,
)
from app.services.employee import (
    CannotDeactivateSelfError,
    EmailAlreadyExistsError,
    EmployeeNotFoundError,
    ManagerNotFoundError,
    create_employee,
    list_employees,
    set_employee_active,
)

# Every route in this router is HR-only: checked once here, so no route can forget it
router = APIRouter(
    prefix="/employees",
    tags=["employees"],
    dependencies=[Depends(require_role(Role.HR))],
)


# response_model filters each Employee down to EmployeePublic (with id, for PATCH /{id}),
# so password_hash never leaves
@router.get("", response_model=list[EmployeePublic])
def get_employees(session: SessionDep) -> list[Employee]:
    return list_employees(session)


@router.post("", response_model=EmployeePublic, status_code=status.HTTP_201_CREATED)
def add_employee(payload: EmployeeCreate, session: SessionDep) -> Employee:
    try:
        return create_employee(session, payload)
    except EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An employee with this email already exists",
        ) from None
    except ManagerNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="reports_to_id must be an active employee",
        ) from None


# Soft delete: {"is_active": false} deactivates the employee, {"is_active": true} restores them.
# HR-only comes from the router; current_user is needed to stop HR deactivating themselves.
@router.patch("/{employee_id}", response_model=EmployeePublic)
def update_employee_status(
    employee_id: uuid.UUID,
    payload: EmployeeStatusUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Employee:
    try:
        return set_employee_active(session, employee_id, payload.is_active, current_user)
    except EmployeeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        ) from None
    except CannotDeactivateSelfError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot deactivate your own account.",
        ) from None
