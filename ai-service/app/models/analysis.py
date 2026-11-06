"""Response models for /analyze. Scores are shares in [0, 1]; the UI shows them as percentages.

Every score here describes *potential* similarity for a reviewer to examine,
never a verdict on its own.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class SourceInfo(BaseModel):
    id: str
    title: str
    authors: list[str] = []
    supervisor: str | None = None
    year: str | None = None
    type: str | None = None
    url: str | None = None


class Excerpt(BaseModel):
    text: str
    section: str = ""


class Evidence(BaseModel):
    """One passage of the submitted report next to the source passage it resembles."""

    perspective: Literal["lexical", "semantic"]
    score: float = Field(..., ge=0.0, le=1.0)
    submitted: Excerpt
    source: Excerpt


class PerspectiveScores(BaseModel):
    lexical: float = Field(0.0, ge=0.0, le=1.0, description="Share of the submitted wording found in the source.")
    semantic: float = Field(
        0.0, ge=0.0, le=1.0, description="Share of submitted passages with a close paraphrase in the source."
    )


class Match(BaseModel):
    source: SourceInfo
    overall: float = Field(..., ge=0.0, le=1.0)
    scores: PerspectiveScores
    evidence: list[Evidence]


class AnalysisSummary(BaseModel):
    overall: float = Field(..., ge=0.0, le=1.0, description="Highest overall score among the matches.")
    lexical_coverage: float = Field(..., ge=0.0, le=1.0, description="Share of submitted words in reused sentences.")
    semantic_coverage: float = Field(..., ge=0.0, le=1.0, description="Share of submitted words in close paraphrases.")
    level: Literal["low", "moderate", "high"]


class DocumentInfo(BaseModel):
    id: str
    title: str | None = None
    words: int
    passages: int
    language: str
    flags: list[str] = []


class AnalysisResult(BaseModel):
    document: DocumentInfo
    summary: AnalysisSummary
    matches: list[Match]
    corpus: dict[str, int | str]
    notes: list[str] = []
