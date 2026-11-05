"""Application settings, read from environment variables (and backend/.env if present)."""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # SQLite works out of the box for local development; use PostgreSQL in Docker and production.
    database_url: str = "sqlite:///./parallax.db"

    # Comma-separated origins allowed to call the API directly from a browser.
    allowed_origins: str = "http://localhost:3000"

    # ----- Auth -----
    allowed_email_domains: str = "diu.edu.bd,daffodilvarsity.edu.bd"
    session_cookie_name: str = Field(default="parallax_session", alias="AUTH_COOKIE_NAME")
    # Secure cookies need HTTPS; defaults to on outside development.
    cookie_secure: bool | None = None
    session_ttl_hours: int = 12
    remember_me_days: int = 30
    login_max_attempts: int = 5
    login_window_minutes: int = 15

    @field_validator("database_url")
    @classmethod
    def _normalise_postgres_scheme(cls, value: str) -> str:
        # Some hosts hand out postgres:// URLs, which SQLAlchemy 2 does not accept.
        if value.startswith("postgres://"):
            return "postgresql://" + value.removeprefix("postgres://")
        return value

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def email_domains(self) -> list[str]:
        return [d.strip().lower() for d in self.allowed_email_domains.split(",") if d.strip()]

    @property
    def secure_cookies(self) -> bool:
        return self.cookie_secure if self.cookie_secure is not None else self.app_env != "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
