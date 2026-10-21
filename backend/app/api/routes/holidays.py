import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import SessionDep
from app.core.deps import CurrentUserDep, require_role
from app.models.enums import Role
from app.models.holiday import Holiday, HolidayCreate, HolidayPublic, HolidayUpdate
from app.services.holiday import (
    HolidayExistsError,
    HolidayNotFoundError,
    create_holiday,
    list_holidays,
    set_holiday_active,
)

# Role checks are per route here: everyone can read holidays, only HR can change them
router = APIRouter(prefix="/holidays", tags=["holidays"])


# current_user is unused, but declaring it makes the route require a login
@router.get("", response_model=list[HolidayPublic])
def get_holidays(session: SessionDep, current_user: CurrentUserDep) -> list[Holiday]:
    return list_holidays(session)


@router.post(
    "",
    response_model=HolidayPublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(Role.HR))],
)
def add_holiday(payload: HolidayCreate, session: SessionDep) -> Holiday:
    try:
        return create_holiday(session, payload)
    except HolidayExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A holiday already exists on this date",
        ) from None


# Soft delete: {"is_active": false} removes the holiday, {"is_active": true} restores it
@router.patch(
    "/{holiday_id}",
    response_model=HolidayPublic,
    dependencies=[Depends(require_role(Role.HR))],
)
def remove_holiday(holiday_id: uuid.UUID, payload: HolidayUpdate, session: SessionDep) -> Holiday:
    try:
        return set_holiday_active(session, holiday_id, payload.is_active)
    except HolidayNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holiday not found",
        ) from None
