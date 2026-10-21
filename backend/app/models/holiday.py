import uuid
from datetime import date

from sqlalchemy import true
from sqlmodel import Field, SQLModel

from app.models.base import TimestampMixin


class HolidayBase(SQLModel):
    """Fields HR sends when adding a holiday."""

    name: str = Field(min_length=1, max_length=100)
    holiday_date: date = Field(unique=True, index=True)
    # Optional holidays are taken through a leave request (category OPTIONAL_HOLIDAY)
    is_optional: bool = Field(default=False)


class Holiday(HolidayBase, TimestampMixin, table=True):
    __tablename__ = "holiday"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # Soft delete: HR removes a holiday by setting this to False. The row stays, so optional
    # holiday requests that point to it keep a valid holiday_id. Every holiday query skips
    # inactive rows. server_default makes existing rows active when the column is added.
    is_active: bool = Field(default=True, sa_column_kwargs={"server_default": true()})


class HolidayCreate(HolidayBase):
    """Request body when HR adds a holiday. New holidays are always active."""


class HolidayPublic(HolidayBase):
    """Response shape. id is needed to remove a holiday and to request an optional one."""

    id: uuid.UUID
    is_active: bool


class HolidayUpdate(SQLModel):
    """Body of PATCH /api/holidays/{id}: false removes the holiday, true restores it."""

    is_active: bool
