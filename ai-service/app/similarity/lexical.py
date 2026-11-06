"""Lexical perspective: reused wording, found by overlapping word shingles.

A shingle is a run of ``n`` consecutive words. Two passages that share many
5-word shingles share actual wording, not just a topic, which is the
signature of copied or lightly edited text.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass

from app.extraction.preprocessor import segment_sentences

SHINGLE_WORDS = 5
MIN_SENTENCE_WORDS = 8  # shorter sentences ("The results are shown below.") prove nothing
MIN_OVERLAP = 0.5


def words(text: str) -> list[str]:
    return re.findall(r"[0-9a-zঀ-৿]+", text.lower())


def shingles(text: str, n: int = SHINGLE_WORDS) -> set[tuple[str, ...]]:
    tokens = words(text)
    return {tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)}


def containment(query: set, source: set) -> float:
    """Share of the query's shingles that also occur in the source."""
    return len(query & source) / len(query) if query else 0.0


@dataclass(frozen=True)
class SentenceMatch:
    query: str
    source: str
    overlap: float  # share of the query sentence's shingles found in the source sentence


class ShingleMatcher:
    """Finds, for each query sentence, the source sentence that shares the most wording."""

    def __init__(self, source_text: str, n: int = SHINGLE_WORDS):
        self.n = n
        self.sentences = [s for s in segment_sentences(source_text) if len(words(s)) >= MIN_SENTENCE_WORDS]
        self.all_shingles: set[tuple[str, ...]] = set()
        self._postings: dict[tuple[str, ...], list[int]] = defaultdict(list)
        for i, sentence in enumerate(self.sentences):
            sentence_shingles = shingles(sentence, n)
            self.all_shingles |= sentence_shingles
            for shingle in sentence_shingles:
                self._postings[shingle].append(i)

    def best_match(self, sentence: str, min_overlap: float = MIN_OVERLAP) -> SentenceMatch | None:
        if len(words(sentence)) < MIN_SENTENCE_WORDS:
            return None
        query = shingles(sentence, self.n)
        hits: Counter[int] = Counter()
        for shingle in query:
            for i in self._postings.get(shingle, ()):
                hits[i] += 1
        if not hits:
            return None
        best, count = hits.most_common(1)[0]
        overlap = count / len(query)
        return SentenceMatch(sentence, self.sentences[best], round(overlap, 4)) if overlap >= min_overlap else None

    def matches(self, query_text: str, min_overlap: float = MIN_OVERLAP) -> list[SentenceMatch]:
        found = (self.best_match(s, min_overlap) for s in segment_sentences(query_text))
        return [m for m in found if m is not None]
