import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import SessionDep
from app.core.deps import CurrentUserDep, require_role
from app.models.enums import ApprovalStatus, Role
from app.models.request import Request, RequestCreate, RequestPublic
from app.models.user import Employee
from app.schemas.request import RequestDecision, RequestWithEmployee
from app.services.request import (
    AlreadyCheckedInError,
    AlreadyDecidedError,
    InvalidOptionalHolidayError,
    NotAllowedToDecideError,
    NoWorkingDaysError,
    OverlappingRequestError,
    RequestError,
    RequestNotFoundError,
    create_request,
    decide_request,
    list_my_requests,
    list_requests,
)

router = APIRouter(prefix="/requests", tags=["requests"])

# HR and managers list and decide requests. Which requests each one may decide (a manager:
# only their direct reports) is checked in the service, by can_decide().
DeciderDep = Annotated[Employee, Depends(require_role(Role.HR, Role.MANAGER))]

_ERRORS: dict[type[RequestError], tuple[int, str]] = {
    NoWorkingDaysError: (422, "The selected dates are all weekends or holidays."),
    InvalidOptionalHolidayError: (422, "Choose an optional holiday on the selected date."),
    OverlappingRequestError: (409, "You already have a request for some of these dates."),
    RequestNotFoundError: (404, "Request not found."),
    NotAllowedToDecideError: (
        403,
        "You can only decide requests from your own team, and never your own.",
    ),
    AlreadyDecidedError: (409, "This request has already been decided."),
    AlreadyCheckedInError: (
        409,
        "The employee already checked in on one of these days, so full-day leave cannot be approved.",
    ),
}


def _http_error(error: RequestError) -> HTTPException:
    code, detail = _ERRORS.get(type(error), (400, "Request not allowed."))
    return HTTPException(status_code=code, detail=detail)


# Any logged-in employee (managers and HR too) raises requests for themselves
@router.post("", response_model=RequestPublic, status_code=status.HTTP_201_CREATED)
def raise_request(payload: RequestCreate, session: SessionDep, current_user: CurrentUserDep) -> Request:
    try:
        return create_request(session, current_user, payload)
    except RequestError as error:
        raise _http_error(error) from None


# Any logged-in employee sees only their own requests: the id comes from the session, never
# from the URL. Keep it above any future GET "/{request_id}", or "me" would match as an id.
@router.get("/me", response_model=list[RequestPublic])
def get_my_requests(session: SessionDep, current_user: CurrentUserDep) -> list[Request]:
    return list_my_requests(session, current_user)


@router.get("")
def get_requests(
    session: SessionDep,
    decider: DeciderDep,
    # Repeat the parameter for several values: ?status=APPROVED&status=REJECTED
    request_status: Annotated[list[ApprovalStatus] | None, Query(alias="status")] = None,
) -> list[RequestWithEmployee]:
    """Approvals list (HR: everyone; manager: their direct reports). ?status=PENDING for
    "Waiting for you", ?status=APPROVED&status=REJECTED for "Decided", no filter for everything."""
    return list_requests(session, decider, request_status)


@router.post("/{request_id}/decision", response_model=RequestPublic)
def decide(
    request_id: uuid.UUID, payload: RequestDecision, session: SessionDep, decider: DeciderDep
) -> Request:
    try:
        return decide_request(session, request_id, decider, payload.status)
    except RequestError as error:
        raise _http_error(error) from None
