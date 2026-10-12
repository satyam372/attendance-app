from collections.abc import Callable
from typing import Annotated

import jwt
from fastapi import Cookie, Depends, Header, HTTPException, status

from app.core.database import SessionDep
from app.core.security import COOKIE_NAME, decode_access_token
from app.models.enums import Role
from app.models.user import Employee


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _token_from_request(cookie_token: str | None, authorization: str | None) -> str | None:
    # 1. Browser: the httpOnly cookie
    if cookie_token:
        return cookie_token
    # 2. Tools/tests: "Authorization: Bearer <token>"
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token:
            return token
    return None


def get_current_user(
    session: SessionDep,
    access_token: Annotated[str | None, Cookie(alias=COOKIE_NAME)] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> Employee:
    token = _token_from_request(access_token, authorization)
    if token is None:
        raise _unauthorized("Not authenticated")

    try:
        employee_id = decode_access_token(token)
    except jwt.InvalidTokenError:  # bad signature, expired, missing claims, bad sub
        raise _unauthorized("Invalid or expired session") from None

    # Loaded fresh on every request, so role changes and deactivation apply immediately
    employee = session.get(Employee, employee_id)
    if employee is None or not employee.is_active:
        raise _unauthorized("Invalid or expired session")
    return employee


CurrentUserDep = Annotated[Employee, Depends(get_current_user)]


def require_role(*roles: Role) -> Callable[[Employee], Employee]:
    """Dependency factory: require_role(Role.HR) lets only HR through, everyone else gets 403."""

    def check_role(current_user: CurrentUserDep) -> Employee:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to do this",
            )
        return current_user

    return check_role


HrUserDep = Annotated[Employee, Depends(require_role(Role.HR))]
