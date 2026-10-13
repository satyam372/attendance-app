"""Business time rules. Times are stored in UTC and evaluated in the office time zone (Asia/Kolkata)."""

from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.core.config import get_settings
from app.models.enums import LeavePortion


def office_tz() -> ZoneInfo:
    return ZoneInfo(get_settings().timezone)


def to_office_time(moment: datetime) -> datetime:
    # A naive value is treated as UTC (that is how every datetime is stored)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)
    return moment.astimezone(office_tz())


def office_today() -> date:
    """Today's date in Pune, not on the server (Vercel runs in UTC)."""
    return datetime.now(office_tz()).date()


def is_weekend(day: date) -> bool:
    return day.weekday() >= 5  # 5 = Saturday, 6 = Sunday


def is_late(
    in_time: datetime | None, leave_portion: LeavePortion, *, working_day: bool
) -> bool | None:
    """Late = check-in after OFFICE_START + LATE_BUFFER_MIN (11:00). 11:00 exactly is on time.

    None when there is no check-in. Never late on a weekend or holiday (working_day=False,
    the caller checks the holiday table) or on a half-day leave day (the employee works the
    other half). Compared at minute precision, so 11:00:45 is still 11:00.
    """
    if in_time is None:
        return None
    if not working_day or leave_portion != LeavePortion.NONE:
        return False

    settings = get_settings()
    local = to_office_time(in_time).replace(second=0, microsecond=0)
    cutoff = datetime.combine(local.date(), settings.office_start, tzinfo=local.tzinfo) + timedelta(
        minutes=settings.late_buffer_min
    )
    return local > cutoff
