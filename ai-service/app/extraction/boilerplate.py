"""Corpus-level boilerplate: sentences that appear in many different reports.

Template wording ("This project report has been submitted in fulfilment of the
requirements…") is shared by design, not reused by a student. Any sentence that
occurs in a sizeable share of the corpus is treated as boilerplate and removed
before similarity is computed, so it can never inflate a score.
"""

from __future__ import annotations

import re
from collections import Counter
from collections.abc import Iterable

from app.extraction.preprocessor import segment_sentences

MIN_SENTENCE_CHARS = 25


def sentence_key(sentence: str) -> str:
    """Comparable form of a sentence: lower-case letters and digits only."""
    return re.sub(r"[^0-9a-zঀ-৿]+", " ", sentence.lower()).strip()


def _keys(text: str) -> set[str]:
    return {sentence_key(s) for s in segment_sentences(text) if len(s) >= MIN_SENTENCE_CHARS}


def find_boilerplate(texts: Iterable[str], *, min_share: float = 0.08, min_docs: int = 3) -> dict[str, int]:
    """Sentence keys found in at least ``max(min_docs, min_share × corpus size)`` documents → document count."""
    document_frequency: Counter[str] = Counter()
    total = 0
    for text in texts:
        total += 1
        document_frequency.update(_keys(text))
    threshold = max(min_docs, int(total * min_share))
    return {key: count for key, count in document_frequency.items() if count >= threshold}


def strip_boilerplate(text: str, boilerplate: set[str] | dict[str, int]) -> str:
    """Remove boilerplate sentences, keeping everything else in order."""
    if not boilerplate:
        return text
    kept = [s for s in segment_sentences(text) if sentence_key(s) not in boilerplate]
    return " ".join(kept)
