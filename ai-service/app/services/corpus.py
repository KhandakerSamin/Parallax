"""The reference corpus: extracted reports loaded from ``data/processed``."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Corpus:
    documents: dict[str, dict] = field(default_factory=dict)

    def __len__(self) -> int:
        return len(self.documents)

    def __contains__(self, doc_id: str) -> bool:
        return doc_id in self.documents

    def get(self, doc_id: str) -> dict | None:
        return self.documents.get(doc_id)

    def meta(self, doc_id: str) -> dict:
        """Display metadata for a report: title, authors, supervisor, year, link."""
        document = self.documents.get(doc_id) or {}
        meta = document.get("meta") or {}
        return {
            "id": doc_id,
            "title": meta.get("title") or f"Report {doc_id}",
            "authors": meta.get("authors") or [],
            "supervisor": meta.get("supervisor"),
            "year": (meta.get("date_issued") or "")[:4] or None,
            "type": meta.get("type"),
            "url": meta.get("url"),
        }

    @classmethod
    def load(cls, directory: str | Path) -> Corpus:
        directory = Path(directory)
        documents = {}
        for path in sorted(directory.glob("[!_]*.json")):
            document = json.loads(path.read_text(encoding="utf-8"))
            documents[str(document["doc_id"])] = document
        return cls(documents)
