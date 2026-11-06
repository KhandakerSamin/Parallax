import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UTCDateTime, utcnow


class Role(str, enum.Enum):  # noqa: UP042 (StrEnum needs Python 3.11)
    student = "student"
    reviewer = "reviewer"
    researcher = "researcher"
    admin = "admin"
    super_admin = "super_admin"


# Roles a person may pick when registering; the others are granted by an admin.
SELF_SIGNUP_ROLES = (Role.student, Role.reviewer)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(80))
    # Stored lower-cased so uniqueness is case-insensitive.
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    # Student or staff ID (FR02: unique per account). Stored upper-cased.
    university_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    role: Mapped[Role] = mapped_column(Enum(Role, name="user_role", native_enum=False, length=20))
    department: Mapped[str] = mapped_column(String(80))
    # None for accounts that only sign in with Google.
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Google's stable account ID ("sub"), set once the account is linked to Google.
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    # Profile photo from Google, refreshed at each Google sign-in.
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)

    sessions: Mapped[list["AuthSession"]] = relationship(  # noqa: F821
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )

    @property
    def google_linked(self) -> bool:
        return self.google_sub is not None

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role.value})>"
