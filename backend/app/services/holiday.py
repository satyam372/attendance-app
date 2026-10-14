"""Holiday lookups shared by attendance and (later) leave/WFH requests."""

from datetime import date, timedelta

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


def holidays_between(session: Session, start: date, end: date) -> dict[date, Holiday]:
    """Holidays in [start, end), keyed by date. One query, so callers can check many days."""
    rows = session.exec(
        select(Holiday).where(Holiday.holiday_date >= start, Holiday.holiday_date < end)
    ).all()
    return {holiday.holiday_date: holiday for holiday in rows}


def holiday_dates_between(session: Session, start: date, end: date) -> set[date]:
    """Dates in [start, end) when the office is closed. Optional holidays are not included:
    the office is open and an employee takes one through a leave request."""
    return {day for day, holiday in holidays_between(session, start, end).items() if not holiday.is_optional}


def is_working_day(session: Session, day: date) -> bool:
    """Monday to Friday and not a company holiday. Optional holidays are working days."""
    if is_weekend(day):
        return False
    closed = session.exec(
        select(Holiday.id).where(Holiday.holiday_date == day, Holiday.is_optional == False)
    ).first()
    return closed is None


def working_days_between(session: Session, start: date, end: date) -> list[date]:
    """Working days in [start, end], inclusive, oldest first. Used for leave/WFH ranges."""
    closed = holiday_dates_between(session, start, end + timedelta(days=1))
    days, day = [], start
    while day <= end:
        if not is_weekend(day) and day not in closed:
            days.append(day)
        day += timedelta(days=1)
    return days
