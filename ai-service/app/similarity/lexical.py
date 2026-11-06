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
    source_section: str = ""


class ShingleMatcher:
    """Finds, for each query sentence, the source sentence that shares the most wording.

    ``source`` is a text, or a list of ``(section title, text)`` so matches can say where
    in the source report they were found.
    """

    def __init__(self, source: str | list[tuple[str, str]], n: int = SHINGLE_WORDS):
        self.n = n
        self.sentences: list[str] = []
        self.sections: list[str] = []
        self.all_shingles: set[tuple[str, ...]] = set()
        self._postings: dict[tuple[str, ...], list[int]] = defaultdict(list)
        for title, text in [("", source)] if isinstance(source, str) else source:
            for sentence in segment_sentences(text):
                if len(words(sentence)) < MIN_SENTENCE_WORDS:
                    continue
                i = len(self.sentences)
                self.sentences.append(sentence)
                self.sections.append(title)
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
        if overlap < min_overlap:
            return None
        return SentenceMatch(sentence, self.sentences[best], round(overlap, 4), self.sections[best])

    def matches(self, query_text: str, min_overlap: float = MIN_OVERLAP) -> list[SentenceMatch]:
        found = (self.best_match(s, min_overlap) for s in segment_sentences(query_text))
        return [m for m in found if m is not None]
