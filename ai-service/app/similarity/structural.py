"""Structural perspective: are two reports organised the same way?

A report's structure is its outline: the sequence of chapter and section
headings. Two outlines are aligned in order (a weighted longest common
subsequence), with headings counted as equal when they share most of their
words.

Every DIU report has an Introduction, a Methodology and a Conclusion, so each
heading is weighted by how rare it is in the corpus. A copied skeleton of
distinctive headings ("Program Schedule and Duration", "Service Portfolio")
scores high. The shared template alone does not.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass

from app.similarity.concept import STOPWORDS

NUMBERING = re.compile(r"^\s*(chapter\s+)?[\divxlc]+(\.\d+)*[.)]?\s+", re.IGNORECASE)
WORD = re.compile(r"[a-z0-9]+|[ঀ-৿]+")


def heading_words(title: str) -> frozenset[str]:
    """The meaningful words of a heading, without its number ("1.2", "Chapter 3")."""
    title = NUMBERING.sub("", title.lower())
    return frozenset(w for w in WORD.findall(title) if w not in STOPWORDS and not w.isdigit())


def outline(document: dict) -> list[str]:
    """Normalised headings in reading order, skipping empty ones."""
    headings = []
    for section in document.get("sections", []):
        words = heading_words(section.get("title", ""))
        if words:
            headings.append(" ".join(sorted(words)))
    return headings


def _same(a: str, b: str) -> bool:
    if a == b:
        return True
    wa, wb = set(a.split()), set(b.split())
    return len(wa & wb) / len(wa | wb) >= 0.6


@dataclass(frozen=True)
class HeadingPair:
    submitted: str
    source: str


@dataclass(frozen=True)
class StructureMatch:
    score: float
    aligned: list[HeadingPair]  # matching headings, most distinctive first


class StructureModel:
    """Heading frequencies from the corpus, so common template headings count for little."""

    def __init__(self, documents: Iterable[dict]) -> None:
        self.outlines: dict[str, list[str]] = {}
        self.titles: dict[str, list[str]] = {}
        df: Counter[str] = Counter()
        for document in documents:
            doc_id = str(document["doc_id"])
            self.outlines[doc_id] = outline(document)
            self.titles[doc_id] = _display_titles(document)
            df.update(set(self.outlines[doc_id]))
        self.size = len(self.outlines)
        self.df = df

    def weight(self, heading: str) -> float:
        # Unseen headings are as distinctive as the rarest corpus heading.
        return math.log((1 + self.size) / (1 + self.df.get(heading, 0))) + 0.1

    def outline_of(self, document: dict) -> tuple[list[str], list[str]]:
        doc_id = str(document.get("doc_id", ""))
        if doc_id in self.outlines:
            return self.outlines[doc_id], self.titles[doc_id]
        return outline(document), _display_titles(document)

    def compare(self, submitted: dict, source_id: str, *, pairs: int = 10) -> StructureMatch:
        a, a_titles = self.outline_of(submitted)
        b, b_titles = self.outlines.get(source_id, []), self.titles.get(source_id, [])
        if not a or not b:
            return StructureMatch(0.0, [])
        wa = [self.weight(h) for h in a]
        wb = [self.weight(h) for h in b]

        # Weighted LCS: the best in-order alignment of matching headings.
        n, m = len(a), len(b)
        best = [[0.0] * (m + 1) for _ in range(n + 1)]
        for i in range(n - 1, -1, -1):
            for j in range(m - 1, -1, -1):
                skip = max(best[i + 1][j], best[i][j + 1])
                take = best[i + 1][j + 1] + (wa[i] + wb[j]) / 2 if _same(a[i], b[j]) else 0.0
                best[i][j] = max(skip, take)

        aligned: list[tuple[float, HeadingPair]] = []
        i = j = 0
        while i < n and j < m:
            if _same(a[i], b[j]) and best[i][j] == best[i + 1][j + 1] + (wa[i] + wb[j]) / 2:
                aligned.append(((wa[i] + wb[j]) / 2, HeadingPair(a_titles[i], b_titles[j])))
                i, j = i + 1, j + 1
            elif best[i + 1][j] >= best[i][j + 1]:
                i += 1
            else:
                j += 1

        # Dice-style: shared weight relative to both outlines, so a short outline can't score high by subset.
        score = 2 * best[0][0] / (sum(wa) + sum(wb))
        aligned.sort(key=lambda item: item[0], reverse=True)
        return StructureMatch(round(min(score, 1.0), 4), [pair for _, pair in aligned[:pairs]])


def _display_titles(document: dict) -> list[str]:
    """Original heading text, parallel to outline()."""
    return [
        re.sub(r"\s+", " ", s.get("title", "")).strip()
        for s in document.get("sections", [])
        if heading_words(s.get("title", ""))
    ]
