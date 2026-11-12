import uuid
from datetime import datetime

from sqlalchemy import JSON, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UTCDateTime, utcnow


class Report(Base):
    """A saved similarity analysis: the AI service's full result plus a summary for listing.

    The summary columns are copied out of `result` so the report list never has to
    load the (large) JSON.
    """

    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(String(300))
    source_kind: Mapped[str] = mapped_column(String(10))  # "pdf" or "text"
    source_name: Mapped[str] = mapped_column(String(300))

    overall: Mapped[float] = mapped_column(Float)
    hybrid: Mapped[float] = mapped_column(Float, default=0.0)
    level: Mapped[str] = mapped_column(String(10))
    words: Mapped[int] = mapped_column(Integer, default=0)
    match_count: Mapped[int] = mapped_column(Integer, default=0)
    top_source_title: Mapped[str | None] = mapped_column(String(500), nullable=True)

    result: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)

    # A reviewer's decision. "pending" until someone reviews it; the score never decides.
    review_status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending", index=True)
    review_note: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    reviewed_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)

    user: Mapped["User"] = relationship(back_populates="reports", foreign_keys=[user_id])  # noqa: F821
    reviewed_by: Mapped["User | None"] = relationship(foreign_keys=[reviewed_by_id])  # noqa: F821

    @property
    def owner_name(self) -> str | None:
        return self.user.name if self.user else None

    @property
    def owner_university_id(self) -> str | None:
        return self.user.university_id if self.user else None

    @property
    def reviewer_name(self) -> str | None:
        return self.reviewed_by.name if self.reviewed_by else None
