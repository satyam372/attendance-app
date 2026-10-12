from pydantic import field_validator
from sqlmodel import Field, SQLModel


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
