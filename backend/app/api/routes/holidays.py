from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import SessionDep
from app.core.deps import CurrentUserDep, require_role
from app.models.enums import Role
from app.models.holiday import Holiday, HolidayCreate, HolidayPublic
from app.services.holiday import HolidayExistsError, create_holiday, list_holidays

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
