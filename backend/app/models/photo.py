"""Profile photos, one per employee, stored in Postgres.

The browser crops and resizes to a 256x256 WebP/JPEG before uploading, so a photo is a few KB
and needs no separate file storage. Kept out of the employee table so loading an employee
(every request, in get_current_user) never reads the image bytes.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, LargeBinary
from sqlmodel import Field, SQLModel


class EmployeePhoto(SQLModel, table=True):
    __tablename__ = "employee_photo"

    # One photo per employee: the employee id is the primary key, so a new upload replaces it
    employee_id: uuid.UUID = Field(
        primary_key=True, foreign_key="employee.id", ondelete="CASCADE"
    )
    content_type: str = Field(max_length=20)  # image/webp, image/jpeg or image/png
    data: bytes = Field(sa_type=LargeBinary)  # bytea in Postgres
    # Same value as employee.photo_updated_at, set in services/photo.py
    updated_at: datetime = Field(sa_type=DateTime(timezone=True))
