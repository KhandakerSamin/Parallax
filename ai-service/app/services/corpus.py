"""The reference corpus: extracted reports loaded from ``data/processed``.

``Corpus.load`` keeps only each report's metadata and file path in memory and reads a
report's full text from disk when it is asked for. With ~2,000 reports (15 million words)
holding every text in memory would not fit next to the model on a small server, and an
analysis only ever needs the full text of its few shortlisted sources.

Reports listed in ``_duplicates.json`` (extra copies the repository holds; see
``scripts/find_duplicates.py``) are left out.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path

DUPLICATES_FILE = "_duplicates.json"


def _read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


@dataclass
class Corpus:
    documents: dict[str, dict] = field(default_factory=dict)  # held in memory (tests, small setups)
    paths: dict[str, Path] = field(default_factory=dict)  # on disk, read when needed
    metas: dict[str, dict] = field(default_factory=dict)  # metadata of the on-disk reports

    def __len__(self) -> int:
        return len(self.documents.keys() | self.paths.keys())

    def __contains__(self, doc_id: str) -> bool:
        return doc_id in self.documents or doc_id in self.paths

    def __iter__(self) -> Iterator[dict]:
        """Every report, one at a time; can be iterated more than once."""
        for doc_id in self.ids():
            document = self.get(doc_id)
            if document is not None:
                yield document

    def ids(self) -> list[str]:
        return sorted(self.documents.keys() | self.paths.keys())

    def get(self, doc_id: str) -> dict | None:
        if doc_id in self.documents:
            return self.documents[doc_id]
        path = self.paths.get(doc_id)
        return _read(path) if path else None

    def meta(self, doc_id: str) -> dict:
        """Display metadata for a report: title, authors, supervisor, year, link."""
        meta = self.metas.get(doc_id)
        if meta is None:
            meta = (self.documents.get(doc_id) or {}).get("meta") or {}
        supervisor = meta.get("supervisor")
        if isinstance(supervisor, list):  # DSpace may list several, or none
            supervisor = ", ".join(supervisor) or None
        return {
            "id": doc_id,
            "title": meta.get("title") or f"Report {doc_id}",
            "authors": meta.get("authors") or [],
            "supervisor": supervisor,
            "year": (meta.get("date_issued") or "")[:4] or None,
            "type": meta.get("type"),
            "url": meta.get("url"),
        }

    @classmethod
    def load(cls, directory: str | Path, *, in_memory: bool = False, skip_duplicates: bool = True) -> Corpus:
        """Index the reports in ``directory``; ``in_memory`` also keeps every full text loaded."""
        directory = Path(directory)
        duplicates_file = directory / DUPLICATES_FILE
        skip = set(_read(duplicates_file)) if skip_duplicates and duplicates_file.exists() else set()
        corpus = cls()
        for path in sorted(directory.glob("[!_]*.json")):
            document = _read(path)
            doc_id = str(document["doc_id"])
            if doc_id in skip:
                continue
            if in_memory:
                corpus.documents[doc_id] = document
            else:
                corpus.paths[doc_id] = path
                corpus.metas[doc_id] = document.get("meta") or {}
        return corpus
