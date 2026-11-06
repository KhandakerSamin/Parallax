"""Text encoders: turn passages into unit-length vectors for semantic search.

``SentenceEncoder`` wraps a multilingual sentence-transformers model, so a Bangla
passage and its English paraphrase land close together. ``HashingEncoder`` needs
no model download; tests and offline runs use it.
"""

from __future__ import annotations

import hashlib
import re
from typing import Protocol

import numpy as np

DEFAULT_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


class Encoder(Protocol):
    name: str
    dim: int

    def encode(self, texts: list[str]) -> np.ndarray:
        """Return a float32 array of shape (len(texts), dim) with unit-length rows."""
        ...


def _normalise(vectors: np.ndarray) -> np.ndarray:
    vectors = np.asarray(vectors, dtype=np.float32)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return vectors / norms


class SentenceEncoder:
    """A sentence-transformers model, loaded on first use."""

    def __init__(self, model_name: str = DEFAULT_MODEL, batch_size: int = 64, device: str | None = None):
        self.name = model_name
        self.batch_size = batch_size
        self._device = device
        self._model = None

    @property
    def model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer  # heavy import, deferred

            self._model = SentenceTransformer(self.name, device=self._device)
        return self._model

    @property
    def dim(self) -> int:
        return int(self.model.get_sentence_embedding_dimension())

    def encode(self, texts: list[str], show_progress: bool = False) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dim), dtype=np.float32)
        vectors = self.model.encode(
            texts,
            batch_size=self.batch_size,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=show_progress,
        )
        return _normalise(vectors)


class HashingEncoder:
    """Bag of hashed words and word pairs. Deterministic and dependency-free.

    It only captures shared vocabulary, not meaning. Use it in tests and as a
    fallback, never as the real semantic perspective.
    """

    def __init__(self, dim: int = 256):
        self.name = f"hashing-{dim}"
        self.dim = dim

    def _bucket(self, token: str) -> int:
        return int.from_bytes(hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest(), "little") % self.dim

    def encode(self, texts: list[str]) -> np.ndarray:
        vectors = np.zeros((len(texts), self.dim), dtype=np.float32)
        for row, text in enumerate(texts):
            words = re.findall(r"\w+", text.lower())
            for token in words + [f"{a} {b}" for a, b in zip(words, words[1:], strict=False)]:
                vectors[row, self._bucket(token)] += 1.0
        return _normalise(vectors)
