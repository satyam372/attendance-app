import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import SessionDep
from app.core.deps import CurrentUserDep, require_role
from app.models.enums import Role
from app.models.user import Employee, EmployeePublic, EmployeeUpdate
from app.schemas.employee import (
    EmployeeCreated,
    EmployeeCreateRequest,
    WelcomeEmailResult,
)
from app.services.employee import (
    CannotDeactivateSelfError,
    EmailAlreadyExistsError,
    EmployeeNotFoundError,
    InvalidManagerError,
    ManagerHasTeamError,
    ManagerNotFoundError,
    create_employee,
    list_employees,
    update_employee,
)
from app.services.welcome import (
    AccountInactiveError,
    OwnAccountError,
    resend_welcome_email,
    send_welcome_email,
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


# The account is created first; the welcome email is sent after, and a mail problem never undoes
# it (welcome_email is then FAILED, and HR still has the password on screen to share by hand).
@router.post("", response_model=EmployeeCreated, status_code=status.HTTP_201_CREATED)
def add_employee(payload: EmployeeCreateRequest, session: SessionDep) -> EmployeeCreated:
    try:
        employee = create_employee(session, payload)
    except EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An employee with this email already exists",
        ) from None
    except ManagerNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="reports_to_id must be an active manager",
        ) from None
    welcome = send_welcome_email(session, employee, payload.password) if payload.send_welcome_email else None
    return EmployeeCreated.model_validate(employee, update={"welcome_email": welcome})


# Sets a new temporary password (only its hash is stored, so the old one cannot be resent) and
# emails it. current_user is needed to refuse HR's own account.
@router.post("/{employee_id}/welcome-email", response_model=WelcomeEmailResult)
def resend_login_details(
    employee_id: uuid.UUID, session: SessionDep, current_user: CurrentUserDep
) -> WelcomeEmailResult:
    try:
        welcome, password = resend_welcome_email(session, employee_id, current_user)
    except EmployeeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        ) from None
    except AccountInactiveError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This account is deactivated.",
        ) from None
    except OwnAccountError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Use Change password for your own account.",
        ) from None
    return WelcomeEmailResult(welcome_email=welcome, temporary_password=password)


# Partial update: {"is_active": false} deactivates (soft delete), {"is_active": true} restores,
# {"reports_to_id": ...} changes the manager. HR-only comes from the router; current_user is
# needed to stop HR deactivating themselves.
@router.patch("/{employee_id}", response_model=EmployeePublic)
def patch_employee(
    employee_id: uuid.UUID,
    payload: EmployeeUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Employee:
    try:
        return update_employee(session, employee_id, payload, current_user)
    except EmployeeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        ) from None
    except ManagerNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="reports_to_id must be an active manager",
        ) from None
    except InvalidManagerError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="An employee cannot report to themselves or to someone in their own team.",
        ) from None
    except CannotDeactivateSelfError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot deactivate your own account.",
        ) from None
    except ManagerHasTeamError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Assign {error.manager_name}'s team to another manager first.",
        ) from None
