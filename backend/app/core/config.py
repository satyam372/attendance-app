from datetime import time
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import EmailStr, Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env, resolved from this file so it works from any working directory
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore", env_ignore_empty=True)

    # App
    environment: Literal["local", "dev", "qa", "production"] = "local"

    # Database
    database_url: str

    # JWT
    jwt_secret: str
    jwt_expire_minutes: int = 480

    # Auth cookie
    cookie_secure: bool = False
    cookie_domain: str | None = None
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    # CORS
    cors_origins: list[str] = ["http://localhost:1234"]

    # Business rules
    timezone: str = "Asia/Kolkata"
    office_start: time = time(10, 30)
    office_end: time = time(19, 30)
    late_buffer_min: int = 30
    wfh_free_days_per_month: int = 2

    # Office location for OFFICE check-in. No default for the coordinates: the app refuses to
    # start until they are set, instead of silently checking against the wrong place.
    office_lat: float = Field(ge=-90, le=90)
    office_lng: float = Field(ge=-180, le=180)
    office_radius_m: int = Field(default=200, gt=0)
    # Locations less precise than this are rejected; otherwise "distance - accuracy <= radius"
    # would let a check-in with a 50 km accuracy pass from anywhere in the city
    office_max_accuracy_m: int = Field(default=500, gt=0)

    # Email. MAIL_PROVIDER picks how it goes out:
    #   "resend": Resend's HTTPS API (RESEND_API_KEY, and MAIL_FROM on a domain verified in Resend)
    #   "smtp":   any SMTP server with STARTTLS (MAIL_USERNAME / MAIL_PASSWORD)
    # Until that provider's settings are filled in, sending is off: emails are only logged as
    # SKIPPED, so local dev and tests never email anyone.
    mail_provider: Literal["smtp", "resend"] = "smtp"
    # Forces sending off whatever else is set; the tests use it (tests/conftest.py)
    mail_disabled: bool = False
    resend_api_key: SecretStr | None = None
    mail_server: str = "smtp.office365.com"
    mail_port: int = 587
    mail_username: str | None = None
    mail_password: SecretStr | None = None
    # The sender address. SMTP: defaults to MAIL_USERNAME (Microsoft 365 only accepts an address
    # the account may send as). Resend: required, on the verified domain.
    mail_from: EmailStr | None = None
    mail_from_name: str = "SpeedIn Attendance"
    # Where replies go, e.g. hr@ when MAIL_FROM is an address nobody reads
    mail_reply_to: EmailStr | None = None
    mail_timeout_seconds: int = 10
    # Used for the link in emails
    app_url: str = "http://localhost:1234"

    @property
    def mail_enabled(self) -> bool:
        if self.mail_disabled:
            return False
        if self.mail_provider == "resend":
            return self.resend_api_key is not None and self.mail_from is not None
        return self.mail_username is not None

    @model_validator(mode="after")
    def check_production_safety(self) -> "Settings":
        if self.environment != "local":
            if len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be at least 32 characters outside local")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true outside local")
        if self.mail_provider == "smtp" and self.mail_username is not None and self.mail_password is None:
            raise ValueError("MAIL_PASSWORD is required when MAIL_USERNAME is set")
        if self.mail_provider == "resend" and self.resend_api_key is not None and self.mail_from is None:
            raise ValueError("MAIL_FROM is required with MAIL_PROVIDER=resend")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
