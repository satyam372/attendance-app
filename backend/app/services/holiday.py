"""Holiday lookups shared by attendance and (later) leave/WFH requests."""

from datetime import date

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.core.time import is_weekend
from app.models.holiday import Holiday, HolidayCreate


class HolidayExistsError(Exception):
    """A holiday is already set for this date (holiday_date is unique)."""


def list_holidays(session: Session) -> list[Holiday]:
    """All holidays, earliest first."""
    return list(session.exec(select(Holiday).order_by(Holiday.holiday_date)).all())


def create_holiday(session: Session, data: HolidayCreate) -> Holiday:
    if session.exec(select(Holiday.id).where(Holiday.holiday_date == data.holiday_date)).first():
        raise HolidayExistsError(data.holiday_date)

    holiday = Holiday.model_validate(data)
    session.add(holiday)
    try:
        session.commit()
    except IntegrityError as exc:
        # Two HR users adding the same date at once: the unique index stops the second
        session.rollback()
        raise HolidayExistsError(data.holiday_date) from exc
    session.refresh(holiday)
    return holiday


def holiday_dates_between(session: Session, start: date, end: date) -> set[date]:
    """Holiday dates in [start, end). One query, so callers can check many days cheaply."""
    rows = session.exec(
        select(Holiday.holiday_date).where(Holiday.holiday_date >= start, Holiday.holiday_date < end)
    ).all()
    return set(rows)


def is_working_day(session: Session, day: date) -> bool:
    """Monday to Friday and not a company holiday (optional holidays included)."""
    if is_weekend(day):
        return False
    holiday = session.exec(select(Holiday.id).where(Holiday.holiday_date == day)).first()
    return holiday is None
