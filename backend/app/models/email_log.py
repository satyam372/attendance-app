"""History of every email the app tried to send: who, which email, and whether it went out.

The body is not stored: it can be rebuilt from the template, and some emails (temporary
password) would put secrets in the database.
"""

import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Index, text
from sqlmodel import Field

from app.models.base import TimestampMixin
from app.models.enums import EmailKind, EmailStatus


class EmailLog(TimestampMixin, table=True):
    __tablename__ = "email_log"
    __table_args__ = (
        # A reminder is always about one employee and one day, so the index below can dedupe it
        CheckConstraint(
            "kind <> 'CHECK_IN_REMINDER' OR (employee_id IS NOT NULL AND work_date IS NOT NULL)",
            name="ck_email_log_reminder",
        ),
        # At most one sent (or skipped) email per employee, kind and day, so a cron job that runs
        # twice cannot email someone twice. FAILED rows are left out, so a failed send can be
        # retried and every failure stays in the history.
        Index(
            "uq_email_log_once",
            "employee_id",
            "kind",
            "work_date",
            unique=True,
            postgresql_where=text("status <> 'FAILED'"),
            sqlite_where=text("status <> 'FAILED'"),
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # Null for emails not about one employee (e.g. a future HR summary)
    employee_id: uuid.UUID | None = Field(default=None, foreign_key="employee.id", index=True)
    kind: EmailKind
    work_date: date | None = Field(default=None)  # the day the email is about (Pune date)
    # The address used at the time; the employee's email may change later
    to_address: str = Field(max_length=255)
    subject: str = Field(max_length=255)
    status: EmailStatus
    error: str | None = Field(default=None, max_length=1000)  # exception message when FAILED
