"""Turn a PDF report into a clean, structured document ready for similarity analysis."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from pathlib import Path

from app.extraction.pdf_reader import read_pdf
from app.extraction.preprocessor import clean_text, detect_language_hint
from app.extraction.sections import segment

# Below this many words of body text the PDF is probably scanned images.
MIN_BODY_WORDS = 500
_BANGLA = re.compile(r"[ঀ-৿]")
_LATIN = re.compile(r"[A-Za-z]")
# Legacy (non-Unicode) Bangla fonts such as SutonnyMJ map Bangla glyphs onto Latin-1
# punctuation, so "বাংলাদেশ" comes out as "evsjv‡`k". These marks inside words give it away.
_LEGACY_BANGLA = re.compile(r"[a-zA-Z][‡ˆ†‰Š¨©ª«¯°±²³´µ¶·¸¹º»¼½¾¿×Ö]|[‡ˆ†‰Š][a-zA-Z`]")


@dataclass
class DocumentSection:
    title: str
    kind: str
    chapter_kind: str
    level: int
    number: str | None
    page_start: int
    text: str


@dataclass
class ExtractedDocument:
    doc_id: str
    page_count: int
    abstract: str
    sections: list[DocumentSection]
    references: list[str]
    language: str
    stats: dict[str, float | int] = field(default_factory=dict)
    flags: list[str] = field(default_factory=list)

    @property
    def body_text(self) -> str:
        """Chapter text used for similarity (appendices excluded: mostly code and forms)."""
        return "\n\n".join(s.text for s in self.sections if s.text and s.chapter_kind != "appendix")

    @property
    def outline(self) -> list[str]:
        """Section kinds in reading order, one per chapter — the document's 'shape'."""
        return [s.kind for s in self.sections if s.level == 1]

    def to_dict(self) -> dict:
        data = asdict(self)
        data["outline"] = self.outline
        return data


def extract_document(path: str | Path, doc_id: str | None = None) -> ExtractedDocument:
    path = Path(path)
    content = read_pdf(path)
    segmented = segment(content.pages, content.body_font_size)

    sections = [
        DocumentSection(
            title=clean_text(s.title),
            kind=s.kind,
            chapter_kind=s.chapter_kind,
            level=s.level,
            number=s.number,
            page_start=s.page_start,
            text=clean_text(s.text),
        )
        for s in segmented.sections
    ]
    abstract = clean_text(segmented.abstract)
    document = ExtractedDocument(
        doc_id=doc_id or path.stem,
        page_count=len(content.pages),
        abstract=abstract,
        sections=sections,
        references=[clean_text(r) for r in segmented.references],
        language="en",
    )

    body = document.body_text
    sample = f"{abstract} {body}"
    bangla = len(_BANGLA.findall(sample))
    latin = len(_LATIN.findall(sample))
    words = len(body.split())
    document.language = detect_language_hint(sample) if sample.strip() else "en"
    document.stats = {
        "body_words": words,
        "abstract_words": len(abstract.split()),
        "sections": len(sections),
        "chapters": sum(1 for s in sections if s.level == 1),
        "references": len(document.references),
        "skipped_pages": len(segmented.skipped_pages),
        "bangla_ratio": round(bangla / (bangla + latin), 4) if bangla + latin else 0.0,
        "private_use_chars": content.private_use_chars,
    }

    if words < MIN_BODY_WORDS:
        document.flags.append("little_text")  # likely a scanned PDF; needs OCR
    legacy_marks = len(_LEGACY_BANGLA.findall(sample))
    document.stats["legacy_font_marks"] = legacy_marks
    if legacy_marks > 100 and legacy_marks > 0.002 * max(len(sample), 1):
        document.flags.append("legacy_bangla_font")  # e.g. SutonnyMJ: Bangla text is not real Unicode
    if segmented.body_start_page is None:
        document.flags.append("no_structure")
    if not abstract:
        document.flags.append("no_abstract")
    if not document.references:
        document.flags.append("no_references")
    return document
