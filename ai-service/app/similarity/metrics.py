"""Text similarity computation using token-level and character-level metrics.

This module provides lightweight similarity functions that do **not** require
ML model weights, making them suitable for CI and for use as baseline
comparators alongside the heavier embedding-based pipeline.
"""

from __future__ import annotations

import math
import re
from collections import Counter


def jaccard_similarity(text_a: str, text_b: str) -> float:
    """Compute Jaccard similarity between two texts based on word tokens.

    J(A, B) = |A ∩ B| / |A ∪ B|

    Args:
        text_a: First document text.
        text_b: Second document text.

    Returns:
        Jaccard coefficient in [0.0, 1.0].  Returns 0.0 when both texts
        are empty.
    """
    tokens_a = set(_tokenize(text_a))
    tokens_b = set(_tokenize(text_b))
    if not tokens_a and not tokens_b:
        return 0.0
    intersection = tokens_a & tokens_b
    union = tokens_a | tokens_b
    return len(intersection) / len(union)


def cosine_similarity_bow(text_a: str, text_b: str) -> float:
    """Compute cosine similarity between bag-of-words vectors of two texts.

    Args:
        text_a: First document text.
        text_b: Second document text.

    Returns:
        Cosine similarity in [0.0, 1.0].  Returns 0.0 when either text
        is empty.
    """
    vec_a = Counter(_tokenize(text_a))
    vec_b = Counter(_tokenize(text_b))
    if not vec_a or not vec_b:
        return 0.0

    common_keys = set(vec_a.keys()) & set(vec_b.keys())
    dot = sum(vec_a[k] * vec_b[k] for k in common_keys)
    mag_a = math.sqrt(sum(v * v for v in vec_a.values()))
    mag_b = math.sqrt(sum(v * v for v in vec_b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def ngram_overlap(text_a: str, text_b: str, n: int = 3) -> float:
    """Compute character n-gram overlap ratio between two texts.

    Overlap = |ngrams(A) ∩ ngrams(B)| / max(|ngrams(A)|, |ngrams(B)|)

    This metric is especially useful for detecting near-copies and
    transliteration-based reuse in Bangla text.

    Args:
        text_a: First document text.
        text_b: Second document text.
        n: Size of character n-grams.

    Returns:
        Overlap ratio in [0.0, 1.0].

    Raises:
        ValueError: If *n* is less than 1.
    """
    if n < 1:
        raise ValueError(f"n must be >= 1, got {n}")

    ngrams_a = _char_ngrams(text_a, n)
    ngrams_b = _char_ngrams(text_b, n)
    if not ngrams_a and not ngrams_b:
        return 0.0

    overlap = ngrams_a & ngrams_b
    denominator = max(len(ngrams_a), len(ngrams_b))
    return len(overlap) / denominator if denominator else 0.0


def containment(text_a: str, text_b: str) -> float:
    """Compute word-level containment of *text_a* within *text_b*.

    C(A, B) = |tokens(A) ∩ tokens(B)| / |tokens(A)|

    A high containment score suggests that *text_a* is largely
    subsumed by *text_b*.

    Args:
        text_a: Source / query text.
        text_b: Reference text.

    Returns:
        Containment ratio in [0.0, 1.0].  Returns 0.0 when *text_a*
        is empty.
    """
    tokens_a = set(_tokenize(text_a))
    tokens_b = set(_tokenize(text_b))
    if not tokens_a:
        return 0.0
    return len(tokens_a & tokens_b) / len(tokens_a)


# ── private helpers ─────────────────────────────────────────


def _tokenize(text: str) -> list[str]:
    """Lowercase and split on non-alphanumeric boundaries.

    Works for both Latin and Bangla scripts because ``\\w`` in Python's
    ``re`` module is Unicode-aware.
    """
    return re.findall(r"\w+", text.lower())


def _char_ngrams(text: str, n: int) -> set[str]:
    """Generate the set of character n-grams from *text*."""
    text = text.lower()
    return {text[i : i + n] for i in range(len(text) - n + 1)}
