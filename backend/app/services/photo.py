"""Profile photos: replace, remove and read. Used by api/routes/photos.py."""

import uuid
from datetime import UTC, datetime

from sqlmodel import Session

from app.models.photo import EmployeePhoto
from app.models.user import Employee

# The frontend sends 256x256 WebP/JPEG of a few KB; this leaves room without letting the
# database fill up with originals straight from a phone camera
MAX_PHOTO_BYTES = 200 * 1024


class EmployeeNotFoundError(Exception):
    """No employee with this id."""


class PhotoNotFoundError(Exception):
    """The employee has no photo."""


class UnsupportedImageError(Exception):
    """Not a WebP, JPEG or PNG image, or the bytes do not match the declared type."""


def sniff_image_type(data: bytes) -> str | None:
    """The image type from the file's first bytes, or None for anything else (SVG included).
    Never trust the Content-Type alone: it is whatever the client says."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def replace_photo(
    session: Session, employee: Employee, data: bytes, content_type: str
) -> Employee:
    """Upload or replace the employee's photo. `content_type` is the request's Content-Type and
    must match what the bytes really are. Size is checked by the route while reading the body."""
    image_type = sniff_image_type(data)
    if image_type is None or image_type != content_type:
        raise UnsupportedImageError

    now = datetime.now(UTC)
    photo = session.get(EmployeePhoto, employee.id)
    if photo is None:
        photo = EmployeePhoto(
            employee_id=employee.id, content_type=image_type, data=data, updated_at=now
        )
    else:
        photo.content_type = image_type
        photo.data = data
        photo.updated_at = now
    employee.photo_updated_at = now
    session.add(photo)
    session.add(employee)
    session.commit()
    session.refresh(employee)
    return employee


def remove_photo(session: Session, employee_id: uuid.UUID) -> None:
    """Delete the employee's photo. Does nothing when there is none (the result is the same)."""
    employee = session.get(Employee, employee_id)
    if employee is None:
        raise EmployeeNotFoundError(employee_id)
    photo = session.get(EmployeePhoto, employee_id)
    if photo is not None:
        session.delete(photo)
    if employee.photo_updated_at is not None:
        employee.photo_updated_at = None
        session.add(employee)
    session.commit()


def get_photo(session: Session, employee_id: uuid.UUID) -> EmployeePhoto:
    photo = session.get(EmployeePhoto, employee_id)
    if photo is None:
        raise PhotoNotFoundError(employee_id)
    return photo
