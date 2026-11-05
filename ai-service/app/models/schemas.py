"""Pydantic schemas for the AI service API.

These models define the request / response contracts and are also used
for internal data validation between pipeline stages.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


# ── Enumerations ────────────────────────────────────────────


class LanguageCode(str, Enum):
    """Supported language codes."""

    BN = "bn"
    EN = "en"
    MIXED = "mixed"


class SimilarityMethod(str, Enum):
    """Available similarity computation methods."""

    JACCARD = "jaccard"
    COSINE_BOW = "cosine_bow"
    NGRAM = "ngram"
    CONTAINMENT = "containment"
    EMBEDDING = "embedding"


# ── Request schemas ─────────────────────────────────────────


class TextPairRequest(BaseModel):
    """Request body for comparing two text passages."""

    text_a: str = Field(..., min_length=1, description="First text passage.")
    text_b: str = Field(..., min_length=1, description="Second text passage.")
    method: SimilarityMethod = Field(
        SimilarityMethod.JACCARD,
        description="Similarity method to use.",
    )


class DocumentUploadRequest(BaseModel):
    """Metadata submitted alongside a document file upload."""

    title: str = Field(..., min_length=1, max_length=500)
    language: LanguageCode = LanguageCode.MIXED
    description: str = Field("", max_length=2000)


# ── Response schemas ────────────────────────────────────────


class SimilarityResult(BaseModel):
    """Response for a pairwise similarity comparison."""

    score: float = Field(..., ge=0.0, le=1.0, description="Similarity score.")
    method: SimilarityMethod
    language_a: LanguageCode = LanguageCode.MIXED
    language_b: LanguageCode = LanguageCode.MIXED


class HealthResponse(BaseModel):
    """Response for the health-check endpoint."""

    status: str = "ok"
    service: str = "ai-service"
    version: str = "0.1.0"
