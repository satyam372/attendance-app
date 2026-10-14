from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import SessionDep
from app.core.deps import require_role
from app.models.enums import Role
from app.models.user import Employee, EmployeeBase, EmployeeCreate, EmployeePublic
from app.services.employee import (
    EmailAlreadyExistsError,
    ManagerNotFoundError,
    create_employee,
    list_employees,
)

# Every route in this router is HR-only: checked once here, so no route can forget it
router = APIRouter(
    prefix="/employees",
    tags=["employees"],
    dependencies=[Depends(require_role(Role.HR))],
)


# response_model filters each Employee down to EmployeeBase, so password_hash never leaves
@router.get("", response_model=list[EmployeeBase])
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
