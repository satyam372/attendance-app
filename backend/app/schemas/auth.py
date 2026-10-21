from pydantic import field_validator
from sqlmodel import Field, SQLModel

from app.schemas.password import NewPassword


class LoginRequest(SQLModel):
    """Body of POST /api/auth/login. The response is EmployeePublic; the token goes in a cookie."""

    # Plain str, not EmailStr: a typo should get "invalid email or password", not a 422
    email: str = Field(min_length=1, max_length=255, description="Work email")
    # No min_length: creation rules may change, existing passwords must still log in.
    # max_length matches EmployeeCreate (bcrypt limit) and stops huge payloads.
    password: str = Field(min_length=1, max_length=72, description="Plain password")

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: str) -> str:
        # Stored emails are lowercase, so " Asha@Example.com " must match "asha@example.com"
        return value.strip().lower()


class ChangePasswordRequest(SQLModel):
    """Body of POST /api/auth/change-password. Only for the logged-in user's own password:
    the user comes from the cookie, so there is no employee_id here."""

    # Same rules as LoginRequest.password: checked against the stored hash, not the policy,
    # so an existing password is accepted even if the policy changes later.
    current_password: str = Field(min_length=1, max_length=72)
    # Policy for new passwords: 8+ characters, at most 72 bytes (schemas/password.py).
    # "New must differ from current" is checked in the service against the stored hash.
    new_password: NewPassword
