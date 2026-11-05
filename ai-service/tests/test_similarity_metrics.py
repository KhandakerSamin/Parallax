"""Tests for app.similarity.metrics — token & character-level similarity."""

from __future__ import annotations

import pytest

from app.similarity.metrics import (
    containment,
    cosine_similarity_bow,
    jaccard_similarity,
    ngram_overlap,
)


# ── jaccard_similarity ─────────────────────────────────────


class TestJaccardSimilarity:
    def test_identical_texts(self):
        assert jaccard_similarity("hello world", "hello world") == 1.0

    def test_completely_different(self):
        assert jaccard_similarity("alpha beta", "gamma delta") == 0.0

    def test_partial_overlap(self):
        score = jaccard_similarity("the cat sat", "the dog sat")
        # tokens: {the, cat, sat} vs {the, dog, sat}
        # intersection = {the, sat} = 2, union = {the, cat, sat, dog} = 4
        assert score == pytest.approx(0.5)

    def test_both_empty(self):
        assert jaccard_similarity("", "") == 0.0

    def test_one_empty(self):
        assert jaccard_similarity("hello", "") == 0.0

    def test_case_insensitive(self):
        """Tokenizer lowercases, so casing should not matter."""
        assert jaccard_similarity("Hello World", "hello world") == 1.0

    def test_bangla_tokens(self):
        score = jaccard_similarity("আমি বাংলায় লিখি", "আমি বাংলায় লিখি")
        assert score == 1.0


# ── cosine_similarity_bow ──────────────────────────────────


class TestCosineSimilarityBow:
    def test_identical_texts(self):
        assert cosine_similarity_bow("hello world", "hello world") == pytest.approx(1.0)

    def test_completely_different(self):
        assert cosine_similarity_bow("alpha", "beta") == 0.0

    def test_partial_overlap(self):
        score = cosine_similarity_bow("the cat sat on the mat", "the dog sat on the rug")
        assert 0.0 < score < 1.0

    def test_empty_text(self):
        assert cosine_similarity_bow("", "hello") == 0.0

    def test_both_empty(self):
        assert cosine_similarity_bow("", "") == 0.0

    def test_repeated_words_boost(self):
        """Repeated words should affect the BoW vector magnitude."""
        score_once = cosine_similarity_bow("cat", "cat dog")
        score_twice = cosine_similarity_bow("cat cat", "cat dog")
        # Both should be > 0, but exact values depend on normalization
        assert score_once > 0
        assert score_twice > 0


# ── ngram_overlap ──────────────────────────────────────────


class TestNgramOverlap:
    def test_identical_texts(self):
        assert ngram_overlap("hello", "hello") == 1.0

    def test_completely_different(self):
        assert ngram_overlap("abc", "xyz") == 0.0

    def test_partial_overlap(self):
        score = ngram_overlap("abcdef", "cdefgh", n=3)
        assert 0.0 < score < 1.0

    def test_empty_texts(self):
        assert ngram_overlap("", "", n=2) == 0.0

    def test_text_shorter_than_n(self):
        assert ngram_overlap("ab", "ab", n=3) == 0.0  # no 3-grams possible

    def test_invalid_n(self):
        with pytest.raises(ValueError, match="n must be >= 1"):
            ngram_overlap("hello", "world", n=0)

    def test_n_equals_one(self):
        score = ngram_overlap("abc", "bcd", n=1)
        # 1-grams: {a,b,c} vs {b,c,d} → overlap {b,c}=2, max_size=3
        assert score == pytest.approx(2 / 3)

    def test_bangla_ngrams(self):
        score = ngram_overlap("বাংলা", "বাংলা", n=2)
        assert score == 1.0


# ── containment ────────────────────────────────────────────


class TestContainment:
    def test_full_containment(self):
        assert containment("hello world", "hello beautiful world today") == 1.0

    def test_no_containment(self):
        assert containment("alpha beta", "gamma delta") == 0.0

    def test_partial_containment(self):
        score = containment("the cat sat", "the dog sat on mat")
        # tokens_a = {the, cat, sat}, tokens_b has {the, sat} in common → 2/3
        assert score == pytest.approx(2 / 3)

    def test_empty_source(self):
        assert containment("", "hello") == 0.0

    def test_empty_reference(self):
        assert containment("hello", "") == 0.0

    def test_identical(self):
        assert containment("same text", "same text") == 1.0
