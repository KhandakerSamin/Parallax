"""Tests for app.models.schemas — Pydantic validation and enums."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.schemas import (
    DocumentUploadRequest,
    HealthResponse,
    LanguageCode,
    SimilarityMethod,
    SimilarityResult,
    TextPairRequest,
)


# ── LanguageCode enum ──────────────────────────────────────


class TestLanguageCode:
    def test_values(self):
        assert LanguageCode.BN == "bn"
        assert LanguageCode.EN == "en"
        assert LanguageCode.MIXED == "mixed"

    def test_from_string(self):
        assert LanguageCode("bn") == LanguageCode.BN


# ── SimilarityMethod enum ─────────────────────────────────


class TestSimilarityMethod:
    def test_all_methods_present(self):
        methods = {m.value for m in SimilarityMethod}
        assert "jaccard" in methods
        assert "cosine_bow" in methods
        assert "ngram" in methods
        assert "containment" in methods
        assert "embedding" in methods


# ── TextPairRequest ────────────────────────────────────────


class TestTextPairRequest:
    def test_valid_request(self):
        req = TextPairRequest(text_a="hello", text_b="world")
        assert req.text_a == "hello"
        assert req.method == SimilarityMethod.JACCARD  # default

    def test_custom_method(self):
        req = TextPairRequest(text_a="a", text_b="b", method="cosine_bow")
        assert req.method == SimilarityMethod.COSINE_BOW

    def test_empty_text_a_rejected(self):
        with pytest.raises(ValidationError):
            TextPairRequest(text_a="", text_b="world")

    def test_empty_text_b_rejected(self):
        with pytest.raises(ValidationError):
            TextPairRequest(text_a="hello", text_b="")

    def test_missing_required_field(self):
        with pytest.raises(ValidationError):
            TextPairRequest(text_a="hello")  # type: ignore[call-arg]


# ── DocumentUploadRequest ─────────────────────────────────


class TestDocumentUploadRequest:
    def test_valid_minimal(self):
        req = DocumentUploadRequest(title="My Paper")
        assert req.language == LanguageCode.MIXED
        assert req.description == ""

    def test_title_too_long(self):
        with pytest.raises(ValidationError):
            DocumentUploadRequest(title="x" * 501)

    def test_empty_title_rejected(self):
        with pytest.raises(ValidationError):
            DocumentUploadRequest(title="")

    def test_description_max_length(self):
        req = DocumentUploadRequest(title="Paper", description="a" * 2000)
        assert len(req.description) == 2000

    def test_description_too_long(self):
        with pytest.raises(ValidationError):
            DocumentUploadRequest(title="Paper", description="a" * 2001)


# ── SimilarityResult ──────────────────────────────────────


class TestSimilarityResult:
    def test_valid_result(self):
        res = SimilarityResult(score=0.85, method=SimilarityMethod.JACCARD)
        assert res.score == 0.85

    def test_score_out_of_range_high(self):
        with pytest.raises(ValidationError):
            SimilarityResult(score=1.5, method=SimilarityMethod.JACCARD)

    def test_score_out_of_range_low(self):
        with pytest.raises(ValidationError):
            SimilarityResult(score=-0.1, method=SimilarityMethod.JACCARD)

    def test_boundary_values(self):
        r0 = SimilarityResult(score=0.0, method=SimilarityMethod.NGRAM)
        r1 = SimilarityResult(score=1.0, method=SimilarityMethod.NGRAM)
        assert r0.score == 0.0
        assert r1.score == 1.0


# ── HealthResponse ─────────────────────────────────────────


class TestHealthResponse:
    def test_defaults(self):
        resp = HealthResponse()
        assert resp.status == "ok"
        assert resp.service == "ai-service"
        assert resp.version == "0.1.0"

    def test_custom_values(self):
        resp = HealthResponse(status="degraded", version="0.2.0")
        assert resp.status == "degraded"
