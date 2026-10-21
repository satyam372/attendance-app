"""Password policy for NEW passwords (HR creating an account, employee changing theirs).
Login does not use this: existing passwords must keep working if the policy changes."""

from typing import Annotated

from pydantic import AfterValidator, Field

from app.core.security import BCRYPT_MAX_BYTES


def _fits_bcrypt(value: str) -> str:
    # max_length counts characters; bcrypt counts bytes ("é" is 2 bytes)
    if len(value.encode()) > BCRYPT_MAX_BYTES:
        raise ValueError(f"Password must be at most {BCRYPT_MAX_BYTES} bytes")
    return value


NewPassword = Annotated[str, Field(min_length=8, max_length=72), AfterValidator(_fits_bcrypt)]
