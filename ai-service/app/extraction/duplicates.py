"""Reports that the repository holds more than once.

DSpace sometimes lists the same report twice (re-uploads, or filed under two
collections). Left in, every copy would look like a ~100% match for the other and
crowd out real sources. Only the lowest id of each group is kept.

A copy is a report whose text is identical to another's, or whose opening passage
(words 200-1,200) is identical *and* which shares an author, which catches a lightly
revised re-upload. A shared opening without a shared author is never treated as a copy:
that is exactly the potential similarity Parallax exists to show.
"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Iterable

MIN_WORDS = 200
OPENING = slice(200, 1200)


def _words(document: dict) -> list[str]:
    parts = [document.get("abstract", "")] + [s.get("text", "") for s in document.get("sections", [])]
    return re.findall(r"\w+", " ".join(parts).lower())


def _hash(words: list[str]) -> str:
    return hashlib.sha1(" ".join(words).encode("utf-8")).hexdigest()


def _authors(document: dict) -> set[str]:
    return {a.strip().lower() for a in (document.get("meta") or {}).get("authors") or [] if a.strip()}


def _id_order(doc_id: str) -> tuple[int, str]:
    return (int(doc_id), doc_id) if doc_id.isdigit() else (2**63, doc_id)


def find_duplicates(documents: Iterable[dict]) -> dict[str, str]:
    """Map each extra copy's id to the id of the report kept in its place."""
    by_text: dict[str, list[str]] = {}
    by_opening: dict[str, list[str]] = {}
    authors: dict[str, set[str]] = {}
    for document in documents:
        doc_id = str(document["doc_id"])
        words = _words(document)
        if len(words) < MIN_WORDS:
            continue
        by_text.setdefault(_hash(words), []).append(doc_id)
        by_opening.setdefault(_hash(words[OPENING]), []).append(doc_id)
        authors[doc_id] = _authors(document)

    # Union-find over "is a copy of" links, so chains (a~b, b~c) end up in one group.
    parent: dict[str, str] = {}

    def root(doc_id: str) -> str:
        while parent.get(doc_id, doc_id) != doc_id:
            doc_id = parent[doc_id]
        return doc_id

    def link(a: str, b: str) -> None:
        ra, rb = root(a), root(b)
        if ra != rb:
            keep, drop = sorted((ra, rb), key=_id_order)
            parent[drop] = keep

    for ids in by_text.values():
        for other in ids[1:]:
            link(ids[0], other)
    for ids in by_opening.values():
        for i, a in enumerate(ids):
            for b in ids[i + 1 :]:
                if authors[a] & authors[b]:
                    link(a, b)

    return {doc_id: root(doc_id) for doc_id in parent if root(doc_id) != doc_id}
