"""Password hashing (bcrypt) and access tokens (JWT). Pure functions: no database, no HTTP."""

import secrets
import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import get_settings

ALGORITHM = "HS256"
COOKIE_NAME = "access_token"
BCRYPT_MAX_BYTES = 72

# Temporary passwords: no look-alike characters (0/O, 1/l/I), so one read from an email or
# typed by hand still works. Same alphabet as frontend/src/lib/domain/password.js.
TEMPORARY_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"


def generate_temporary_password(length: int = 12) -> str:
    return "".join(secrets.choice(TEMPORARY_PASSWORD_ALPHABET) for _ in range(length))


def hash_password(password: str) -> str:
    password_bytes = password.encode()
    # Safety net only; the password policy lives in the request schemas
    if len(password_bytes) > BCRYPT_MAX_BYTES:
        raise ValueError(f"Password must be at most {BCRYPT_MAX_BYTES} bytes")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    password_bytes = password.encode()
    # Nothing longer than 72 bytes can have been hashed, so it cannot match
    if len(password_bytes) > BCRYPT_MAX_BYTES:
        return False
    return bcrypt.checkpw(password_bytes, password_hash.encode())


def create_access_token(employee_id: uuid.UUID) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(employee_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> uuid.UUID:
    """Return the employee id from a valid token. Raises jwt.InvalidTokenError otherwise."""
    settings = get_settings()
    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[ALGORITHM],  # never trust the alg in the token header
        options={"require": ["sub", "iat", "exp"]},
    )
    try:
        return uuid.UUID(payload["sub"])
    except ValueError as exc:
        raise jwt.InvalidTokenError("Token subject is not a valid id") from exc
