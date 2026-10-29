"""Raising, listing and deciding leave/WFH requests.

Approval lives only on `request`. Approving writes the matching attendance rows in the same
transaction, so a request is never APPROVED without its attendance (CLAUDE.md, Business rules).
"""

import uuid
from datetime import UTC, datetime

from sqlmodel import Session, select

from app.models.attendance import Attendance
from app.models.enums import ApprovalStatus, LeavePortion, RequestType, Role, WorkMode
from app.models.holiday import Holiday
from app.models.request import Request, RequestCreate, RequestPublic
from app.models.user import Employee
from app.schemas.request import RequestWithEmployee
from app.services.holiday import working_days_between


class RequestError(Exception):
    """Base class. The route maps each subclass to a status code."""


class NoWorkingDaysError(RequestError):
    """The range contains only weekends and holidays."""


class OverlappingRequestError(RequestError):
    """A pending or approved request already covers one of these dates."""


class InvalidOptionalHolidayError(RequestError):
    """holiday_id is unknown, not optional, or not on the requested date."""


class RequestNotFoundError(RequestError):
    """No request with this id."""


class NotAllowedToDecideError(RequestError):
    """The decider is not the requester's manager (or HR), or it is their own request."""


class AlreadyDecidedError(RequestError):
    """The request is no longer PENDING."""


class AlreadyCheckedInError(RequestError):
    """Full-day leave cannot be approved for a day the employee already checked in."""


def create_request(session: Session, employee: Employee, data: RequestCreate) -> Request:
    if not working_days_between(session, data.from_date, data.to_date):
        raise NoWorkingDaysError

    if data.holiday_id is not None:
        holiday = session.get(Holiday, data.holiday_id)
        if (
            holiday is None
            or not holiday.is_active  # a removed holiday cannot be requested
            or not holiday.is_optional
            or holiday.holiday_date != data.from_date
        ):
            raise InvalidOptionalHolidayError

    overlap = session.exec(
        select(Request.id).where(
            Request.employee_id == employee.id,
            Request.status.in_([ApprovalStatus.PENDING, ApprovalStatus.APPROVED]),
            Request.from_date <= data.to_date,
            Request.to_date >= data.from_date,
        )
    ).first()
    if overlap is not None:
        raise OverlappingRequestError

    request = Request.model_validate(data, update={"employee_id": employee.id})
    session.add(request)
    session.commit()
    session.refresh(request)
    return request


def list_requests(
    session: Session, decider: Employee, statuses: list[ApprovalStatus] | None = None
) -> list[RequestWithEmployee]:
    """Newest first. [PENDING] is "Waiting for you"; [APPROVED, REJECTED] is "Decided";
    None or [] means every status. HR sees every request; a manager sees only requests from
    EMPLOYEEs who report to them (the ones they may decide). Nobody sees their own requests
    here, because nobody decides their own (they are in GET /api/requests/me)."""
    query = (
        select(Request)
        .join(Employee, Request.employee_id == Employee.id)
        .order_by(Request.created_at.desc())
    )
    query = query.where(Request.employee_id != decider.id)
    if decider.role != Role.HR:
        query = query.where(Employee.reports_to_id == decider.id, Employee.role == Role.EMPLOYEE)
    if statuses:
        query = query.where(Request.status.in_(statuses))
    requests = list(session.exec(query).all())
    people = _people(session, requests)
    return [
        RequestWithEmployee.model_validate(
            request,
            update={**_names(request, people), "employee_name": people[request.employee_id].name},
        )
        for request in requests
    ]


def list_my_requests(session: Session, employee: Employee) -> list[RequestPublic]:
    """The employee's own requests, every status, newest first."""
    query = (
        select(Request)
        .where(Request.employee_id == employee.id)
        .order_by(Request.created_at.desc())
    )
    return to_public(session, list(session.exec(query).all()))


def _people(session: Session, requests: list[Request]) -> dict[uuid.UUID, Employee]:
    """Everyone a list of requests mentions (requesters, deciders, requesters' managers), loaded
    in at most two queries instead of one per request."""
    ids = {r.employee_id for r in requests} | {r.decided_by_id for r in requests if r.decided_by_id}
    people = {e.id: e for e in session.exec(select(Employee).where(Employee.id.in_(ids))).all()}
    manager_ids = {e.reports_to_id for e in people.values() if e.reports_to_id} - people.keys()
    if manager_ids:
        managers = session.exec(select(Employee).where(Employee.id.in_(manager_ids))).all()
        people |= {e.id: e for e in managers}
    return people


def approver_name(requester: Employee, manager: Employee | None) -> str:
    """Who decides this person's requests, by the same rule as can_decide(): an EMPLOYEE's
    active manager, otherwise HR (managers, HR staff, employees without a manager)."""
    if (
        requester.role == Role.EMPLOYEE
        and manager is not None
        and manager.is_active
        and manager.role == Role.MANAGER
    ):
        return manager.name
    return "HR"


def _names(request: Request, people: dict[uuid.UUID, Employee]) -> dict[str, str | None]:
    requester = people[request.employee_id]
    manager = people.get(requester.reports_to_id) if requester.reports_to_id else None
    decider = people.get(request.decided_by_id) if request.decided_by_id else None
    return {
        "approver_name": approver_name(requester, manager),
        "decided_by_name": decider.name if decider else None,
    }


def to_public(session: Session, requests: list[Request]) -> list[RequestPublic]:
    """Response shape with approver_name and decided_by_name filled in."""
    people = _people(session, requests)
    return [RequestPublic.model_validate(r, update=_names(r, people)) for r in requests]


def _attendance_values(request: Request) -> dict:
    """What an approved request writes into each day's attendance row."""
    match request.request_type:
        case RequestType.FULL_LEAVE:
            return {"leave_portion": LeavePortion.FULL, "leave_half": None, "work_mode": None}
        case RequestType.HALF_DAY_LEAVE:
            return {"leave_portion": LeavePortion.HALF, "leave_half": request.leave_half}
        case RequestType.HALF_LEAVE_HALF_WFH:
            return {
                "leave_portion": LeavePortion.HALF,
                "leave_half": request.leave_half,
                "work_mode": WorkMode.WFH,
            }
        case RequestType.HALF_WFH:
            return {"leave_portion": LeavePortion.NONE, "leave_half": None, "work_mode": WorkMode.HYBRID}
        case RequestType.FULL_WFH:
            return {"leave_portion": LeavePortion.NONE, "leave_half": None, "work_mode": WorkMode.WFH}


def _apply_to_attendance(session: Session, request: Request) -> None:
    days = working_days_between(session, request.from_date, request.to_date)
    existing = {
        row.work_date: row
        for row in session.exec(
            select(Attendance).where(
                Attendance.employee_id == request.employee_id,
                Attendance.work_date >= request.from_date,
                Attendance.work_date <= request.to_date,
            )
        ).all()
    }

    # Check every day before writing any, so a conflict leaves nothing half-applied
    if request.request_type == RequestType.FULL_LEAVE and any(
        existing[d].in_time is not None for d in days if d in existing
    ):
        raise AlreadyCheckedInError

    values = _attendance_values(request)
    for day in days:
        row = existing.get(day) or Attendance(employee_id=request.employee_id, work_date=day)
        for field, value in values.items():
            setattr(row, field, value)
        # Half-day leave keeps the mode already chosen at check-in; default to OFFICE
        if row.leave_portion == LeavePortion.HALF and row.work_mode is None:
            row.work_mode = WorkMode.OFFICE
        row.request_id = request.id  # in_time / out_time are kept as they are
        session.add(row)


def can_decide(decider: Employee, requester: Employee) -> bool:
    """Who may approve or reject a request. A foreign key cannot check roles or the reporting
    line, so this is the only place the rule is enforced (the route only lets HR and managers in).

    - Nobody decides their own request, HR included.
    - HR decides everyone's: the normal path for managers' and HR staff's requests, and an
      override for employees' requests.
    - A manager decides only for EMPLOYEEs who report to them; a manager's own request goes to HR.
    """
    if decider.id == requester.id:
        return False
    if decider.role == Role.HR:
        return True
    return (
        decider.role == Role.MANAGER
        and requester.role == Role.EMPLOYEE
        and requester.reports_to_id == decider.id
    )


def decide_request(
    session: Session,
    request_id: uuid.UUID,
    decider: Employee,
    status: ApprovalStatus,
    now: datetime | None = None,
) -> Request:
    request = session.get(Request, request_id)
    if request is None:
        raise RequestNotFoundError
    if not can_decide(decider, session.get(Employee, request.employee_id)):
        raise NotAllowedToDecideError
    if request.status != ApprovalStatus.PENDING:
        raise AlreadyDecidedError

    if status == ApprovalStatus.APPROVED:
        _apply_to_attendance(session, request)
    request.status = status
    request.decided_by_id = decider.id
    request.decided_at = now if now is not None else datetime.now(UTC)
    session.add(request)
    session.commit()  # request and attendance rows together, or neither
    session.refresh(request)
    return request
