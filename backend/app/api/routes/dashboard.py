from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import SessionDep
from app.core.deps import require_role
from app.core.time import office_today
from app.models.enums import Role
from app.schemas.dashboard import DaySummary, TeamMemberDay
from app.services.dashboard import get_day_summary, get_team_day

# HR screens only
router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(require_role(Role.HR))],
)


def target_day(
    day: Annotated[date | None, Query(description="YYYY-MM-DD; defaults to today in Pune")] = None,
) -> date:
    """Shared by both routes. Leave `day` out for today: the server decides "today" in Pune
    time, never the browser's clock. Future dates are rejected."""
    today = office_today()
    target = day or today
    if target > today:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="day cannot be in the future",
        )
    return target


TargetDayDep = Annotated[date, Depends(target_day)]


@router.get("/today")
def day_summary(session: SessionDep, day: TargetDayDep) -> DaySummary:
    """The "Today" cards."""
    return get_day_summary(session, day)


@router.get("/today/team")
def team_day(session: SessionDep, day: TargetDayDep) -> list[TeamMemberDay]:
    """The "Team today" cards: one entry per active employee, sorted by name."""
    return get_team_day(session, day)
