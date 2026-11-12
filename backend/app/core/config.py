"""Application settings, read from environment variables (and backend/.env if present)."""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET_KEY = "dev-only-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # SQLite works out of the box for local development; use PostgreSQL in Docker and production.
    database_url: str = "sqlite:///./parallax.db"

    # Comma-separated origins allowed to call the API directly from a browser.
    allowed_origins: str = "http://localhost:3000"

    # Public URL of the frontend. OAuth callbacks go through it so cookies stay on its domain.
    public_url: str = "http://localhost:3000"

    # Signs short-lived tokens (OAuth state, Google sign-up). Must be set in production.
    secret_key: str = DEV_SECRET_KEY

    # ----- Auth -----
    allowed_email_domains: str = "diu.edu.bd,daffodilvarsity.edu.bd"
    session_cookie_name: str = Field(default="parallax_session", alias="AUTH_COOKIE_NAME")
    # Secure cookies need HTTPS; defaults to on outside development.
    cookie_secure: bool | None = None
    session_ttl_hours: int = 12
    remember_me_days: int = 30
    login_max_attempts: int = 5
    login_window_minutes: int = 15

    # ----- Google sign-in (optional; the button reports "unavailable" until both are set) -----
    google_client_id: str = ""
    google_client_secret: str = ""

    # ----- Similarity analysis (the separate AI service) -----
    ai_service_url: str = "http://localhost:8001"
    # Where browsers send PDFs directly (large uploads can't pass through the website's host).
    # Empty means the same as ai_service_url.
    ai_public_url: str = ""
    # Shared with the AI service: authenticates the backend and signs upload tickets and results.
    ai_shared_secret: str = "dev-ai-shared-secret"
    # A long report takes ~25 s on a laptop CPU, plus ~10 s to load the model the first time.
    ai_timeout_seconds: float = 180.0
    max_upload_mb: int = 25

    @field_validator("ai_service_url", "ai_public_url", "ai_shared_secret")
    @classmethod
    def _strip(cls, value: str) -> str:
        # Values piped into `vercel env add` can carry a trailing newline.
        return value.strip()

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
    def google_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def google_redirect_uri(self) -> str:
        return f"{self.public_url.rstrip('/')}{self.api_prefix}/auth/google/callback"

    def check_production_safety(self) -> None:
        if self.app_env == "production" and self.secret_key in ("", DEV_SECRET_KEY, "change-me-to-a-random-secret"):
            raise RuntimeError("Set SECRET_KEY to a long random value before running in production.")

    @property
    def secure_cookies(self) -> bool:
        return self.cookie_secure if self.cookie_secure is not None else self.app_env != "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
