from fastapi import APIRouter, HTTPException, status

from app.core.database import SessionDep
from app.core.deps import CurrentUserDep
from app.models.attendance import AttendancePublic
from app.schemas.attendance import CheckInRequest, TodayStatus
from app.services.attendance import (
    AlreadyCheckedInError,
    AlreadyCheckedOutError,
    AttendanceError,
    NotCheckedInError,
    OnLeaveError,
    WfhLimitReachedError,
    check_in,
    check_out,
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
        row = check_in(session, current_user, payload.work_mode)
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
