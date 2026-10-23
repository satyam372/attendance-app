from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.core.database import SessionDep
from app.core.deps import CurrentUserDep
from app.core.time import office_today
from app.models.attendance import AttendancePublic
from app.schemas.attendance import AttendanceDay, CheckInRequest, TodayStatus
from app.services.attendance import (
    AlreadyCheckedInError,
    AlreadyCheckedOutError,
    AttendanceError,
    LocationTooImpreciseError,
    NotAtOfficeError,
    NotCheckedInError,
    OnLeaveError,
    WfhLimitReachedError,
    check_in,
    check_out,
    get_month_history,
    get_today_status,
    to_public,
)

# Every logged-in employee (managers and HR included) uses these; no role check needed
router = APIRouter(prefix="/attendance", tags=["attendance"])

# One message per service error. All are 409 Conflict: the request is valid, but today's
# state does not allow it. The frontend can show `detail` as is.
_ERROR_MESSAGES: dict[type[AttendanceError], str] = {
    AlreadyCheckedInError: "You have already checked in today.",
    AlreadyCheckedOutError: "You have already checked out.",
    OnLeaveError: "You are on leave today.",
    WfhLimitReachedError: "You have used your free WFH days this month. Raise a WFH request instead.",
    NotCheckedInError: "You have not checked in yet.",
    NotAtOfficeError: "You are not at the office. Move closer to the office or check in from home.",
    LocationTooImpreciseError: (
        "Your location is not precise enough. Turn on Wi-Fi or location services and try again."
    ),
}


def _conflict(error: AttendanceError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=_ERROR_MESSAGES.get(type(error), "Attendance action not allowed."),
    )


@router.get("/today")
def today(session: SessionDep, current_user: CurrentUserDep) -> TodayStatus:
    return get_today_status(session, current_user)


@router.post("/check-in", status_code=status.HTTP_201_CREATED)
def check_in_route(
    payload: CheckInRequest, session: SessionDep, current_user: CurrentUserDep
) -> AttendancePublic:
    try:
        row = check_in(session, current_user, payload.work_mode, payload.location)
    except AttendanceError as error:
        raise _conflict(error) from None
    return to_public(session, row)


@router.post("/check-out")
def check_out_route(session: SessionDep, current_user: CurrentUserDep) -> AttendancePublic:
    try:
        row = check_out(session, current_user)
    except AttendanceError as error:
        raise _conflict(error) from None
    return to_public(session, row)


@router.get("/history")
def history(
    session: SessionDep,
    current_user: CurrentUserDep,
    year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
    month: Annotated[int | None, Query(ge=1, le=12)] = None,
) -> list[AttendanceDay]:
    """The logged-in employee's days for one month, newest first. Defaults to this month."""
    today = office_today()
    return get_month_history(session, current_user, year or today.year, month or today.month)
