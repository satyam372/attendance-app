import uuid
from datetime import date

from sqlmodel import Field, SQLModel

from app.models.base import TimestampMixin


class HolidayBase(SQLModel):
    """Everything about a holiday is public; HR sends these fields when adding one."""

    name: str = Field(min_length=1, max_length=100)
    holiday_date: date = Field(unique=True, index=True)
    # Optional holidays are taken through a leave request (category OPTIONAL_HOLIDAY)
    is_optional: bool = Field(default=False)


class Holiday(HolidayBase, TimestampMixin, table=True):
    __tablename__ = "holiday"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class HolidayCreate(HolidayBase):
    """Request body when HR adds a holiday."""


class HolidayPublic(HolidayBase):
    """Response shape. id is needed to remove a holiday and to request an optional one."""

    id: uuid.UUID
