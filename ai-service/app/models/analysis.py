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
    concept: float = Field(0.0, ge=0.0, le=1.0, description="How closely the two reports' key terms align.")
    structural: float = Field(0.0, ge=0.0, le=1.0, description="How much of the heading outline the two share.")


class HeadingPair(BaseModel):
    submitted: str
    source: str


class Match(BaseModel):
    source: SourceInfo
    overall: float = Field(..., ge=0.0, le=1.0, description="Text reuse: the larger of lexical and semantic.")
    hybrid: float = Field(0.0, ge=0.0, le=1.0, description="Weighted blend of all four perspectives.")
    scores: PerspectiveScores
    evidence: list[Evidence]
    shared_terms: list[str] = Field(default_factory=list, description="Key terms both reports revolve around.")
    shared_headings: list[HeadingPair] = Field(default_factory=list, description="Headings in the same order.")


class AnalysisSummary(BaseModel):
    overall: float = Field(..., ge=0.0, le=1.0, description="Highest overall score among the matches.")
    lexical_coverage: float = Field(..., ge=0.0, le=1.0, description="Share of submitted words in reused sentences.")
    semantic_coverage: float = Field(..., ge=0.0, le=1.0, description="Share of submitted words in close paraphrases.")
    level: Literal["low", "moderate", "high"]
    hybrid: float = Field(0.0, ge=0.0, le=1.0, description="Highest hybrid score among the matches.")


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
    weights: dict[str, float] = Field(default_factory=dict, description="Perspective weights of the hybrid score.")
    notes: list[str] = []
    signature: str | None = Field(None, description="Proof for the backend that this result is genuine.")
