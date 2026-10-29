"""Request shapes that are not built from RequestBase.
(RequestCreate and RequestPublic live next to the table in models/request.py.)"""

from datetime import datetime
from typing import Literal

from sqlmodel import SQLModel

from app.models.enums import ApprovalStatus
from app.models.request import RequestPublic


class RequestWithEmployee(RequestPublic):
    """HR/manager list: the request plus who raised it ("Snehal Avhad, Fri 9 Oct")."""

    employee_name: str
    # The requester's photo (the request's own id is not theirs: use employee_id for the URL)
    photo_updated_at: datetime | None = None


class RequestDecision(SQLModel):
    """Body when HR (or the manager) approves or rejects. decided_by_id and decided_at are set
    by the server from the logged-in user and the current time, never sent by the client."""

    # PENDING is not a decision, so it is not accepted here
    status: Literal[ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]
