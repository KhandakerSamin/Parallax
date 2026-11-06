"""A FAISS index over corpus passages, saved to and loaded from a directory.

<dir>/index.faiss      inner-product index of unit vectors (inner product = cosine)
<dir>/passages.jsonl   one passage per line, in index order
<dir>/manifest.json    encoder name, dimension, counts, build date
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import faiss
import numpy as np

from app.embeddings.passages import Passage


@dataclass(frozen=True)
class Hit:
    passage: Passage
    score: float


class PassageIndex:
    def __init__(self, dim: int, encoder_name: str):
        self.dim = dim
        self.encoder_name = encoder_name
        self.passages: list[Passage] = []
        self._index = faiss.IndexFlatIP(dim)

    def __len__(self) -> int:
        return len(self.passages)

    @property
    def doc_ids(self) -> set[str]:
        return {p.doc_id for p in self.passages}

    def add(self, passages: list[Passage], vectors: np.ndarray) -> None:
        if len(passages) != len(vectors):
            raise ValueError(f"{len(passages)} passages but {len(vectors)} vectors")
        if len(passages) == 0:
            return
        self._index.add(np.ascontiguousarray(vectors, dtype=np.float32))
        self.passages.extend(passages)

    def search(self, vectors: np.ndarray, k: int = 20, exclude_doc: str | None = None) -> list[list[Hit]]:
        """The ``k`` nearest corpus passages for each query vector, best first."""
        if len(vectors) == 0 or len(self) == 0:
            return [[] for _ in range(len(vectors))]
        # Over-fetch so passages from the excluded document don't eat the budget.
        fetch = min(len(self), k * 2 if exclude_doc else k)
        scores, ids = self._index.search(np.ascontiguousarray(vectors, dtype=np.float32), fetch)
        results: list[list[Hit]] = []
        for row_scores, row_ids in zip(scores, ids, strict=True):
            hits = [
                Hit(self.passages[i], float(s))
                for s, i in zip(row_scores, row_ids, strict=True)
                if i >= 0 and self.passages[i].doc_id != exclude_doc
            ]
            results.append(hits[:k])
        return results

    def stored(self, doc_id: str) -> tuple[list[Passage], np.ndarray] | None:
        """The indexed passages of a corpus report and their vectors, or None if it is not indexed."""
        ids = [i for i, p in enumerate(self.passages) if p.doc_id == doc_id]
        if not ids:
            return None
        vectors = np.vstack([self._index.reconstruct(i) for i in ids]).astype(np.float32)
        return [self.passages[i] for i in ids], vectors

    def save(self, directory: str | Path) -> None:
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self._index, str(directory / "index.faiss"))
        with (directory / "passages.jsonl").open("w", encoding="utf-8") as fh:
            for passage in self.passages:
                fh.write(json.dumps(passage.to_dict(), ensure_ascii=False) + "\n")
        manifest = {
            "encoder": self.encoder_name,
            "dim": self.dim,
            "passages": len(self),
            "documents": len(self.doc_ids),
            "built": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
        (directory / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")

    @classmethod
    def load(cls, directory: str | Path) -> PassageIndex:
        directory = Path(directory)
        manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
        index = cls(manifest["dim"], manifest["encoder"])
        index._index = faiss.read_index(str(directory / "index.faiss"))
        with (directory / "passages.jsonl").open(encoding="utf-8") as fh:
            index.passages = [Passage(**json.loads(line)) for line in fh if line.strip()]
        if index._index.ntotal != len(index.passages):
            raise ValueError(f"index has {index._index.ntotal} vectors but {len(index.passages)} passages")
        return index
