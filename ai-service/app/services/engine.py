"""Loads the corpus, index and encoder once, and turns uploads into analyses."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.config import settings
from app.embeddings.encoder import Encoder, HashingEncoder, SentenceEncoder
from app.embeddings.index import PassageIndex
from app.extraction.boilerplate import strip_boilerplate
from app.extraction.document import extract_document
from app.extraction.preprocessor import clean_text, detect_language_hint
from app.models.analysis import AnalysisResult
from app.pipelines.analyze import Analyzer
from app.services.corpus import Corpus


class IndexNotReadyError(RuntimeError):
    """The corpus index has not been built yet (run scripts/build_index.py)."""


class UnreadablePdfError(ValueError):
    """The upload is not a PDF that can be opened and read."""


def encoder_for(index: PassageIndex) -> Encoder:
    """The encoder the index was built with; anything else would compare apples with oranges."""
    if index.encoder_name.startswith("hashing-"):
        return HashingEncoder(index.dim)
    return SentenceEncoder(index.encoder_name)


class Engine:
    def __init__(self, analyzer: Analyzer, boilerplate: set[str]):
        self.analyzer = analyzer
        self.boilerplate = boilerplate

    @classmethod
    def load(cls, data_dir: Path) -> Engine:
        index_dir, processed_dir = data_dir / "embeddings", data_dir / "processed"
        if not (index_dir / "manifest.json").exists():
            raise IndexNotReadyError(f"No index in {index_dir}. Run scripts/build_index.py first.")
        index = PassageIndex.load(index_dir)
        boilerplate_file = processed_dir / "_boilerplate.json"
        boilerplate = (
            set(json.loads(boilerplate_file.read_text(encoding="utf-8"))) if boilerplate_file.exists() else set()
        )
        return cls(Analyzer(index, encoder_for(index), Corpus.load(processed_dir)), boilerplate)

    def status(self) -> dict:
        index = self.analyzer.index
        return {"documents": len(index.doc_ids), "passages": len(index), "encoder": index.encoder_name}

    def _strip(self, document: dict) -> dict:
        if self.boilerplate:
            document["abstract"] = strip_boilerplate(document.get("abstract", ""), self.boilerplate)
            for section in document.get("sections", []):
                section["text"] = strip_boilerplate(section.get("text", ""), self.boilerplate)
        return document

    def analyze_pdf(self, data: bytes, filename: str) -> AnalysisResult:
        try:
            document = extract_document(data, doc_id="submission").to_dict()
        except Exception as exc:  # PyMuPDF raises several types for damaged files
            raise UnreadablePdfError(str(exc)) from exc
        document["meta"] = {"title": Path(filename).stem or None}
        return self.analyzer.analyze(self._strip(document))

    def analyze_text(self, text: str, title: str | None = None) -> AnalysisResult:
        text = clean_text(text)
        document = {
            "doc_id": "submission",
            "abstract": "",
            "sections": [{"title": "Submitted text", "kind": "other", "chapter_kind": "other", "text": text}],
            "language": detect_language_hint(text),
            "flags": [],
            "meta": {"title": title},
        }
        return self.analyzer.analyze(self._strip(document))


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    return Engine.load(settings.data_dir)
