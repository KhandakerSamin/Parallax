"""Text preprocessing and normalization utilities for Bangla-English documents.

This module provides language-agnostic text cleaning, normalization,
and sentence segmentation functions used throughout the Parallax pipeline.
"""

from __future__ import annotations

import re
import unicodedata


def normalize_whitespace(text: str) -> str:
    """Collapse consecutive whitespace into single spaces and strip edges.

    Args:
        text: Raw input text.

    Returns:
        Text with normalized whitespace.
    """
    return re.sub(r"\s+", " ", text).strip()


def normalize_unicode(text: str) -> str:
    """Apply NFC Unicode normalization.

    This is important for Bangla text where the same visual character
    can be represented by different Unicode sequences.

    Args:
        text: Raw input text.

    Returns:
        NFC-normalized text.
    """
    return unicodedata.normalize("NFC", text)


def remove_control_characters(text: str) -> str:
    """Remove Unicode control characters (category C) except common whitespace.

    Args:
        text: Raw input text.

    Returns:
        Text with control characters removed.
    """
    return "".join(ch for ch in text if unicodedata.category(ch)[0] != "C" or ch in ("\n", "\t", "\r"))


def clean_text(text: str) -> str:
    """Apply the full preprocessing pipeline to raw text.

    Pipeline order:
        1. Remove control characters
        2. NFC Unicode normalization
        3. Collapse whitespace

    Args:
        text: Raw input text.

    Returns:
        Cleaned and normalized text.
    """
    text = remove_control_characters(text)
    text = normalize_unicode(text)
    text = normalize_whitespace(text)
    return text


def segment_sentences(text: str) -> list[str]:
    """Split text into sentences using punctuation heuristics.

    Handles both English sentence terminators (. ! ?) and
    Bangla danda (।) / double danda (॥) characters.

    Args:
        text: Preprocessed text.

    Returns:
        List of sentence strings (empty strings are excluded).
    """
    # Split on English sentence terminators and Bangla dandas
    # The pattern keeps the delimiter attached, then we strip.
    parts = re.split(r"(?<=[.!?।॥])\s+", text)
    return [s.strip() for s in parts if s.strip()]


def detect_language_hint(text: str) -> str:
    """Return a rough language hint based on Unicode script analysis.

    Examines the alphabetic characters in *text* and returns:
        - ``"bn"`` if the majority are Bangla (Bengali script)
        - ``"en"`` if the majority are Latin script
        - ``"mixed"`` otherwise

    This is a lightweight heuristic, not a full language detector.

    Args:
        text: Input text.

    Returns:
        One of ``"bn"``, ``"en"``, or ``"mixed"``.
    """
    bangla_count = 0
    latin_count = 0
    for ch in text:
        if "\u0980" <= ch <= "\u09ff":
            bangla_count += 1
        elif "A" <= ch <= "Z" or "a" <= ch <= "z":
            latin_count += 1

    total = bangla_count + latin_count
    if total == 0:
        return "mixed"

    bangla_ratio = bangla_count / total
    if bangla_ratio > 0.6:
        return "bn"
    elif bangla_ratio < 0.4:
        return "en"
    return "mixed"
