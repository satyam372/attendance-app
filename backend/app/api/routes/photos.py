"""Profile photo routes. A router of their own (not employees.py) because the /employees router is
HR-only as a whole, while anyone signed in may see a photo. So each route here states its own
access: the user's own photo, any photo to look at, HR to remove someone else's."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status

from app.core.database import SessionDep
from app.core.deps import CurrentUserDep, get_current_user, require_role
from app.models.enums import Role
from app.models.user import Employee, EmployeePublic
from app.services.photo import (
    MAX_PHOTO_BYTES,
    EmployeeNotFoundError,
    PhotoNotFoundError,
    UnsupportedImageError,
    get_photo,
    remove_photo,
    replace_photo,
)

router = APIRouter(tags=["photos"])

_TOO_LARGE = HTTPException(
    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
    detail="The photo is too large.",
)


async def photo_body(request: Request) -> bytes:
    """The raw request body, refused with 413 as soon as it passes MAX_PHOTO_BYTES, so a huge
    upload is never read into memory in full. Content-Length is checked first, but it can be
    missing or wrong, so the bytes are counted too."""
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_PHOTO_BYTES:
        raise _TOO_LARGE
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > MAX_PHOTO_BYTES:
            raise _TOO_LARGE
    return bytes(body)


# The body is the image itself (Content-Type image/webp, image/jpeg or image/png), not JSON or a
# form: the browser has already cropped it, so there is nothing else to send.
@router.put("/me/photo", response_model=EmployeePublic)
def upload_my_photo(
    session: SessionDep,
    current_user: CurrentUserDep,
    data: Annotated[bytes, Depends(photo_body)],
    content_type: Annotated[str, Header()] = "",
) -> Employee:
    try:
        return replace_photo(
            session, current_user, data, content_type.split(";")[0].strip().lower()
        )
    except UnsupportedImageError:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a JPEG, PNG or WebP image.",
        ) from None


@router.delete("/me/photo", status_code=status.HTTP_204_NO_CONTENT)
def remove_my_photo(session: SessionDep, current_user: CurrentUserDep) -> None:
    remove_photo(session, current_user.id)


@router.delete(
    "/employees/{employee_id}/photo",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(Role.HR))],
)
def remove_employee_photo(employee_id: uuid.UUID, session: SessionDep) -> None:
    try:
        remove_photo(session, employee_id)
    except EmployeeNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        ) from None


# Anyone signed in: photos appear on HR, manager and approval screens. The URL carries
# ?v=<photo_updated_at> (ignored here), so a new photo gets a new URL and the old one can be
# cached for a year. "private" keeps shared caches (CDN, proxies) from storing it.
@router.get("/employees/{employee_id}/photo", dependencies=[Depends(get_current_user)])
def get_employee_photo(employee_id: uuid.UUID, session: SessionDep) -> Response:
    try:
        photo = get_photo(session, employee_id)
    except PhotoNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No photo",
        ) from None
    return Response(
        content=photo.data,
        media_type=photo.content_type,
        headers={
            "Cache-Control": "private, max-age=31536000, immutable",
            # The browser must use content_type, never guess (e.g. treat the bytes as HTML)
            "X-Content-Type-Options": "nosniff",
        },
    )
