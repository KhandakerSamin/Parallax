"""Split a document into passages: the unit of semantic search and of evidence.

A passage is a run of whole sentences from one section, around ``target_words``
long. Passages never cross a section boundary, so every match can say where in
the report it came from.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import asdict, dataclass

from app.extraction.preprocessor import segment_sentences

TARGET_WORDS = 70  # the model reads at most 128 tokens (~90 English words)
MIN_WORDS = 20
# Sections never compared: appendices are code listings and forms; references are citations.
SKIPPED_CHAPTER_KINDS = frozenset({"appendix", "references"})


@dataclass(frozen=True)
class Passage:
    doc_id: str
    index: int  # position within its document
    section: str  # section title
    kind: str  # section kind (methodology, results, ...)
    text: str

    def to_dict(self) -> dict:
        return asdict(self)


def _windows(text: str, target_words: int) -> Iterable[str]:
    buffer: list[str] = []
    count = 0
    for sentence in segment_sentences(text):
        words = len(sentence.split())
        if buffer and count + words > target_words * 1.3:
            yield " ".join(buffer)
            buffer, count = [], 0
        buffer.append(sentence)
        count += words
        if count >= target_words:
            yield " ".join(buffer)
            buffer, count = [], 0
    if buffer:
        yield " ".join(buffer)


def make_passages(document: dict, *, target_words: int = TARGET_WORDS, min_words: int = MIN_WORDS) -> list[Passage]:
    """Passages from an extracted document (the dict from ``ExtractedDocument.to_dict``)."""
    doc_id = str(document["doc_id"])
    parts: list[tuple[str, str, str]] = []
    if document.get("abstract"):
        parts.append(("Abstract", "abstract", document["abstract"]))
    for section in document.get("sections", []):
        if section.get("chapter_kind") in SKIPPED_CHAPTER_KINDS or section.get("kind") in SKIPPED_CHAPTER_KINDS:
            continue
        if section.get("text"):
            parts.append((section.get("title", ""), section.get("kind", "other"), section["text"]))

    passages: list[Passage] = []
    for title, kind, text in parts:
        windows = list(_windows(text, target_words))
        # Fold a short tail into the previous passage of the same section.
        if len(windows) > 1 and len(windows[-1].split()) < min_words:
            windows[-2] = f"{windows[-2]} {windows.pop()}"
        for window in windows:
            if len(window.split()) >= min_words or len(windows) == 1 and len(window.split()) >= min_words // 2:
                passages.append(Passage(doc_id, len(passages), title, kind, window))
    return passages
