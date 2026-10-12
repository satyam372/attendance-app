"""Shared SQLModel metadata and the timestamp columns every table carries."""

from datetime import datetime

from sqlalchemy import DateTime, func
from sqlmodel import Field, SQLModel


class TimestampMixin(SQLModel):
    """created_at / updated_at for every table. Postgres supplies both values.

    Optional in Python (default=None) so model_validate() works before the row exists;
    NOT NULL in the database. SQLAlchemy leaves None out of the INSERT, so DEFAULT now() fills it.
    """

    created_at: datetime | None = Field(
        default=None,
        nullable=False,
        sa_type=DateTime(timezone=True),
        # server_default writes DEFAULT now() into the table definition itself, so a
        # migration, a seed script or a raw INSERT gets a timestamp too - not just
        # writes that happen to go through the ORM.
        sa_column_kwargs={"server_default": func.now()},
        description="When the row was inserted.",
    )
    updated_at: datetime | None = Field(
        default=None,
        nullable=False,
        sa_type=DateTime(timezone=True),
        # onupdate is applied by SQLAlchemy when it emits an UPDATE - it is not DDL.
        # A raw UPDATE typed into psql will not move this column.
        sa_column_kwargs={"server_default": func.now(), "onupdate": func.now()},
        description="When the row was last written through the ORM.",
    )
