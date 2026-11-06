"""Read a PDF into clean per-page lines.

Each line keeps its font size and boldness, which later stages use to spot
headings. Running headers and footers (e.g. "©Daffodil International University"
on every page) and bare page numbers are removed here, because they would
otherwise make every DIU report look alike.
"""

from __future__ import annotations

import re
import statistics
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

# Private-use glyphs come from symbol fonts (bullets, ticks) or legacy Bangla
# fonts such as SutonnyMJ that are not real Unicode. They carry no text.
_PRIVATE_USE = re.compile(r"[-]")
# Zero-width characters sneak in from Word/Google Docs exports ("6.0​References").
_ZERO_WIDTH = re.compile(r"[​-‍⁠﻿]")
_PAGE_NUMBER = re.compile(r"^(?:page\s*)?(?:\d{1,3}|[ivxlcdm]{1,7})(?:\s*(?:of|/)\s*\d{1,3})?$", re.IGNORECASE)


@dataclass(frozen=True)
class Line:
    text: str
    size: float
    bold: bool


@dataclass
class Page:
    number: int  # 1-based
    lines: list[Line] = field(default_factory=list)

    @property
    def text(self) -> str:
        return "\n".join(line.text for line in self.lines)


@dataclass
class PdfContent:
    pages: list[Page]
    body_font_size: float
    private_use_chars: int
    removed_running_lines: list[str]


def _line_from_spans(spans: list[dict]) -> Line | None:
    text = "".join(span["text"] for span in spans)
    text = _PRIVATE_USE.sub(" ", text)
    text = _ZERO_WIDTH.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return None
    size = max(span["size"] for span in spans)
    bold = any(span["flags"] & 16 or "bold" in span["font"].lower() for span in spans if span["text"].strip())
    return Line(text=text, size=round(size, 1), bold=bold)


def _signature(text: str) -> str:
    """Normalise a line so a header matches across pages despite changing page numbers."""
    return re.sub(r"\d+", "#", text.lower()).strip()


def read_pdf(path: str | Path, *, running_line_ratio: float = 0.3) -> PdfContent:
    """Extract lines from every page and drop running headers/footers and page numbers.

    A line counts as a running header/footer when the same normalised text appears on at
    least ``running_line_ratio`` of the pages (and on at least 3 pages).
    """
    pages: list[Page] = []
    private_use = 0
    size_weight: Counter[float] = Counter()

    with pymupdf.open(path) as doc:
        for index, pdf_page in enumerate(doc):
            page = Page(number=index + 1)
            for block in pdf_page.get_text("dict", sort=True)["blocks"]:
                for raw_line in block.get("lines", []):
                    spans = raw_line["spans"]
                    private_use += sum(len(_PRIVATE_USE.findall(s["text"])) for s in spans)
                    line = _line_from_spans(spans)
                    if line:
                        page.lines.append(line)
                        size_weight[line.size] += len(line.text)
            pages.append(page)

    body_size = size_weight.most_common(1)[0][0] if size_weight else 12.0

    # Running headers/footers: identical (digit-normalised) lines on many pages.
    on_pages: Counter[str] = Counter()
    for page in pages:
        on_pages.update({_signature(line.text) for line in page.lines})
    threshold = max(3, int(len(pages) * running_line_ratio))
    running = {sig for sig, count in on_pages.items() if count >= threshold and len(sig) < 120}

    for page in pages:
        page.lines = [
            line for line in page.lines if _signature(line.text) not in running and not _PAGE_NUMBER.match(line.text)
        ]

    return PdfContent(
        pages=pages,
        body_font_size=body_size,
        private_use_chars=private_use,
        removed_running_lines=sorted(running),
    )


def median_line_length(pages: list[Page]) -> float:
    lengths = [len(line.text) for page in pages for line in page.lines]
    return statistics.median(lengths) if lengths else 0.0
