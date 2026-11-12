from datetime import datetime
from typing import Any, Literal

from pydantic import ConfigDict, Field

from app.schemas.auth import CamelModel


class ReportSummary(CamelModel):
    """What the report list shows; the full result is fetched separately."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    source_kind: str
    source_name: str
    overall: float
    hybrid: float
    level: str
    words: int
    match_count: int
    top_source_title: str | None
    created_at: datetime
    # Who wrote it (shown to reviewers) and the review decision (shown to everyone who can see it).
    user_id: str | None = None
    owner_name: str | None = None
    owner_university_id: str | None = None
    review_status: str = "pending"
    review_note: str | None = None
    reviewer_name: str | None = None
    reviewed_at: datetime | None = None


class ReportListResponse(CamelModel):
    reports: list[ReportSummary]


class ReportResponse(CamelModel):
    report: ReportSummary
    # The AI service's AnalysisResult, unchanged (snake_case keys).
    result: dict[str, Any]


class ReviewRequest(CamelModel):
    status: Literal["pending", "cleared", "follow_up"]
    note: str | None = Field(None, max_length=2000)
