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

    # Email (Microsoft 365 SMTP: STARTTLS on port 587). Leave MAIL_USERNAME empty to disable
    # sending: emails are then only logged, so local dev and tests never email anyone.
    mail_server: str = "smtp.office365.com"
    mail_port: int = 587
    mail_username: str | None = None
    mail_password: SecretStr | None = None
    # Microsoft 365 only accepts a From address the account may send as; defaults to MAIL_USERNAME
    mail_from: EmailStr | None = None
    mail_from_name: str = "SpeedIn Attendance"
    mail_timeout_seconds: int = 10
    # Used for the link in emails
    app_url: str = "http://localhost:1234"

    @property
    def mail_enabled(self) -> bool:
        return self.mail_username is not None

    @model_validator(mode="after")
    def check_production_safety(self) -> "Settings":
        if self.environment != "local":
            if len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be at least 32 characters outside local")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true outside local")
        if self.mail_username is not None and self.mail_password is None:
            raise ValueError("MAIL_PASSWORD is required when MAIL_USERNAME is set")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
