from fastapi import APIRouter, HTTPException, Response, status

from app.core.config import get_settings
from app.core.database import SessionDep
from app.core.deps import CurrentUserDep
from app.core.security import COOKIE_NAME, create_access_token
from app.models.user import Employee, EmployeePublic
from app.schemas.auth import LoginRequest
from app.services.auth import (
    InactiveAccountError,
    InvalidCredentialsError,
    authenticate,
)

router = APIRouter(prefix="/auth", tags=["auth"])


# response_model filters the returned Employee down to EmployeePublic (no password_hash)
@router.post("/login", response_model=EmployeePublic)
def login(payload: LoginRequest, session: SessionDep, response: Response) -> Employee:
    try:
        employee = authenticate(session, payload.email, payload.password)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        ) from None
    except InactiveAccountError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated. Contact HR.",
        ) from None

    settings = get_settings()
    # The token only travels in this httpOnly cookie, never in the response body
    response.set_cookie(
        key=COOKIE_NAME,
        value=create_access_token(employee.id),
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain,
        max_age=settings.jwt_expire_minutes * 60,
        path="/",
    )
    return employee


# No login required: an expired session must still be able to log out
@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    settings = get_settings()
    # Same key, path, domain and flags as login, or the browser keeps the cookie
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        domain=settings.cookie_domain,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )


@router.get("/me", response_model=EmployeePublic)
def me(current_user: CurrentUserDep) -> Employee:
    return current_user
