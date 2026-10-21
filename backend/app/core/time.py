"""Business time rules. Times are stored in UTC and evaluated in the office time zone (Asia/Kolkata)."""

from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.core.config import get_settings
from app.models.enums import LeavePortion, Punctuality


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


def punctuality(
    in_time: datetime | None, leave_portion: LeavePortion, *, working_day: bool
) -> Punctuality | None:
    """ON_TIME up to OFFICE_START (10:30), WITHIN_GRACE up to +LATE_BUFFER_MIN (11:00), then LATE.

    None when punctuality does not apply: weekends and holidays (working_day=False, the caller
    checks the holiday table) and leave days (half-day leave never gets a late tag).
    Compared at minute precision, so 11:00:45 counts as 11:00.
    """
    if not working_day or leave_portion != LeavePortion.NONE:
        return None
    if in_time is None:
        return Punctuality.NO_CHECK_IN

    settings = get_settings()
    local = to_office_time(in_time).replace(second=0, microsecond=0)
    start = datetime.combine(local.date(), settings.office_start, tzinfo=local.tzinfo)
    if local <= start:
        return Punctuality.ON_TIME
    if local <= start + timedelta(minutes=settings.late_buffer_min):
        return Punctuality.WITHIN_GRACE
    return Punctuality.LATE


def is_late(
    in_time: datetime | None, leave_portion: LeavePortion, *, working_day: bool
) -> bool | None:
    """Late = check-in after 11:00 (11:00 exactly is on time). None when there is no check-in;
    False on weekends, holidays and half-day leave days. Same rule as punctuality()."""
    if in_time is None:
        return None
    return punctuality(in_time, leave_portion, working_day=working_day) == Punctuality.LATE
