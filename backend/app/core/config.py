from datetime import time
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import model_validator
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

    @model_validator(mode="after")
    def check_production_safety(self) -> "Settings":
        if self.environment != "local":
            if len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be at least 32 characters outside local")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true outside local")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
