"""AI service settings, read from the environment (or a .env file)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

_REPO = Path(__file__).resolve().parents[2]


def _path(name: str, default: Path) -> Path:
    value = os.getenv(name)
    return Path(value) if value else default


@dataclass(frozen=True)
class Settings:
    data_dir: Path = field(default_factory=lambda: _path("PARALLAX_DATA_DIR", _REPO / "data"))
    # Empty means the default multilingual model; "hashing" uses the offline encoder.
    embedding_model: str = field(default_factory=lambda: os.getenv("EMBEDDING_MODEL", ""))
    max_upload_mb: int = field(default_factory=lambda: int(os.getenv("MAX_UPLOAD_MB", "25")))
    allowed_origins: list[str] = field(
        default_factory=lambda: [o.strip() for o in os.getenv("AI_ALLOWED_ORIGINS", "").split(",") if o.strip()]
    )

    @property
    def processed_dir(self) -> Path:
        return self.data_dir / "processed"

    @property
    def index_dir(self) -> Path:
        return self.data_dir / "embeddings"


settings = Settings()
