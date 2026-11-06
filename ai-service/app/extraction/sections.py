"""Split a thesis/report into abstract, chapters/sections and references.

DIU reports share a template: cover, declarations, approval, acknowledgement,
dedication, abstract, table of contents and lists of figures/tables, then
chapters and references. Only the abstract, the chapters and the references
are kept; the template pages would make unrelated reports look similar.

Headings are found from their text (``CHAPTER 2``, ``3.1 Use Case``,
``REFERENCES``) with font size and boldness as supporting evidence, because
reports format headings very differently.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.extraction.pdf_reader import Line, Page

# ── Page classification ─────────────────────────────────────

_FRONT_MATTER = re.compile(
    r"^(declaration|.*\bdeclaration\b|approval|approval form|certificate|certification|acknowledg\w*|dedication|"
    r"board of examiners|supervised by|submitted by|copyright)\b",
    re.IGNORECASE,
)
_LIST_PAGE = re.compile(
    r"^(table of contents?|contents|list of (figures|tables|abbreviations|acronyms|symbols)|abbreviations)\b",
    re.IGNORECASE,
)
_TOC_LINE = re.compile(r"(\.{3,}|…|\s)\s*(\d{1,3}|[ivx]{1,5})$", re.IGNORECASE)
_ABSTRACT = re.compile(r"^abstract\s*[:.\-–]?\s*(.*)$", re.IGNORECASE)

# ── Headings ────────────────────────────────────────────────

_WORD_NUMBERS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
}  # fmt: skip
_ROMAN = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8, "ix": 9, "x": 10}
_CHAPTER = re.compile(
    r"^chapter\s*[-:]?\s*(\d{1,2}|[ivx]{1,4}|one|two|three|four|five|six|seven|eight|nine|ten)\b\s*[:.\-–]?\s*(.*)$",
    re.IGNORECASE,
)
_NUMBERED = re.compile(r"^(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+(\S.{1,90})$")
_NAMED = re.compile(
    r"^(introduction|literature review|related works?|background( study)?|methodology|research methodology|"
    r"proposed (method|methodology|system|model)|system (design|architecture)|design and implementation|"
    r"implementation|results?( and discussions?)?|discussion|experimental results?|evaluation|testing|"
    r"conclusions?( and future (work|scope))?|future (work|scope)|references|bibliography|appendix(es|ices)?\b.*)$",
    re.IGNORECASE,
)
_REFERENCES = re.compile(r"^(references|bibliography|works cited|reference list)\s*:?$", re.IGNORECASE)

SECTION_KINDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("references", ("reference", "bibliograph", "works cited")),
    ("appendix", ("appendix", "appendices")),
    ("conclusion", ("conclusion", "future work", "future scope", "limitation", "summary", "recommendation")),
    ("results", ("result", "evaluation", "testing", "test case", "experiment", "performance", "discussion", "analysis")),
    ("background", ("literature", "related work", "background", "review", "existing system", "previous work")),
    ("requirements", ("requirement", "specification", "feasibility", "use case", "srs")),
    ("methodology", (
        "method", "design", "architecture", "implementation", "proposed", "model", "development", "approach",
        "system", "framework", "dataset", "data collection", "algorithm", "workflow",
    )),
    ("introduction", ("introduction", "motivation", "problem statement", "objective", "overview", "scope")),
)  # fmt: skip


def classify_kind(title: str) -> str:
    lowered = title.lower()
    for kind, keywords in SECTION_KINDS:
        if any(keyword in lowered for keyword in keywords):
            return kind
    return "other"


@dataclass
class Section:
    title: str
    kind: str
    level: int
    number: str | None
    page_start: int
    lines: list[str] = field(default_factory=list)
    # Kind of the enclosing chapter; a "2.1 Introduction" inside Methodology is still methodology.
    chapter_kind: str = "other"

    @property
    def text(self) -> str:
        return join_lines(self.lines)


@dataclass
class SegmentedDocument:
    abstract: str
    sections: list[Section]
    references: list[str]
    skipped_pages: list[int]
    body_start_page: int | None


# ── Text helpers ────────────────────────────────────────────


def join_lines(lines: list[str]) -> str:
    """Join wrapped lines into running text, repairing words hyphenated across lines."""
    text = ""
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if text.endswith("-") and line[:1].islower() and len(text) > 1 and text[-2].isalpha():
            text = text[:-1] + line
        else:
            text = f"{text} {line}" if text else line
    return re.sub(r"\s+", " ", text).strip()


def _is_toc_page(page: Page) -> bool:
    lines = [line.text for line in page.lines]
    if any(_LIST_PAGE.match(text) for text in lines[:6]):
        return True
    if len(lines) < 6:
        return False
    numbered_ends = sum(1 for text in lines if _TOC_LINE.search(text) and len(text) < 120)
    return numbered_ends / len(lines) >= 0.45


def _is_front_matter_page(page: Page) -> bool:
    return any(_FRONT_MATTER.match(line.text) for line in page.lines[:8])


def _chapter_number(token: str) -> int | None:
    token = token.lower()
    if token.isdigit():
        return int(token)
    return _WORD_NUMBERS.get(token) or _ROMAN.get(token)


def _looks_like_title(line: Line, body_size: float) -> bool:
    text = line.text
    if len(text) > 90 or text.endswith((".", ",", ";")) and not text.endswith("etc."):
        return False
    letters = [ch for ch in text if ch.isalpha()]
    upper_ratio = sum(ch.isupper() for ch in letters) / len(letters) if letters else 0
    return line.bold or line.size >= body_size + 1 or upper_ratio > 0.8


def match_heading(line: Line, next_line: Line | None, body_size: float) -> tuple[int, str | None, str, bool] | None:
    """(level, number, title, consumed_next_line) when the line is a heading, else None."""
    text = line.text.strip()

    chapter = _CHAPTER.match(text)
    if chapter and len(text) <= 100:
        number = _chapter_number(chapter.group(1))
        title = chapter.group(2).strip(" :-–")
        consumed = False
        if not title and next_line and _looks_like_title(next_line, body_size) and not _NUMBERED.match(next_line.text):
            title, consumed = next_line.text.strip(), True
        return 1, str(number) if number else None, title or f"Chapter {chapter.group(1)}", consumed

    if _REFERENCES.match(text) or (_NAMED.match(text) and _looks_like_title(line, body_size)):
        return 1, None, text.rstrip(":"), False

    numbered = _NUMBERED.match(text)
    if numbered:
        number, title = numbered.groups()
        depth = number.count(".") + 1
        title_ok = title[:1].isupper() and not title.rstrip().endswith((".", ",", ";", ":"))
        # "1. The system…" is usually a list item; demand heading styling for single numbers.
        styled = line.bold or line.size >= body_size + 1
        if title_ok and (styled or (depth >= 2 and len(text) <= 70)):
            return min(depth + 1, 4), number, title.strip(), False

    if line.size >= body_size + 2 and _looks_like_title(line, body_size) and len(text) >= 3:
        return 2, None, text, False
    return None


# ── References ──────────────────────────────────────────────

_REF_START = re.compile(r"^(\[\d{1,3}\]|\d{1,3}[.)]\s|\(\d{1,3}\))")


def split_references(lines: list[str]) -> list[str]:
    """Split the reference list into one string per entry."""
    if not lines:
        return []
    if sum(1 for line in lines if _REF_START.match(line)) >= 2:
        entries: list[list[str]] = []
        for line in lines:
            if _REF_START.match(line) or not entries:
                entries.append([line])
            else:
                entries[-1].append(line)
    else:
        # Unnumbered (APA-like) lists: an entry ends with a period, a year or a URL.
        entries, current = [], []
        for line in lines:
            current.append(line)
            if re.search(r"(\.|\d{4}\)?\.?|https?://\S+)$", line.strip()):
                entries.append(current)
                current = []
        if current:
            entries.append(current)
    cleaned = [join_lines(entry) for entry in entries]
    return [entry for entry in cleaned if len(entry) >= 15]


# ── Segmentation ────────────────────────────────────────────


def segment(pages: list[Page], body_size: float) -> SegmentedDocument:
    skipped: list[int] = []
    abstract_lines: list[str] = []
    sections: list[Section] = []
    reference_lines: list[str] = []
    body_started = False
    in_abstract = False
    in_references = False
    body_start_page: int | None = None

    for page in pages:
        if _is_toc_page(page):
            skipped.append(page.number)
            in_abstract = False
            continue

        lines = page.lines
        if not body_started and _is_front_matter_page(page) and not any(_ABSTRACT.match(x.text) for x in lines[:8]):
            skipped.append(page.number)
            continue

        index = 0
        while index < len(lines):
            line = lines[index]
            next_line = lines[index + 1] if index + 1 < len(lines) else None
            index += 1

            if not body_started:
                abstract = _ABSTRACT.match(line.text)
                if abstract and len(line.text) < 40 + len(abstract.group(1)):
                    in_abstract = True
                    if abstract.group(1):
                        abstract_lines.append(abstract.group(1))
                    continue

            heading = match_heading(line, next_line, body_size)
            starts_body = heading is not None and (
                heading[0] == 1 and (heading[1] in ("1", None) and classify_kind(heading[2]) == "introduction" or heading[1] == "1")
            )
            if not body_started:
                if starts_body:
                    body_started, in_abstract = True, False
                    body_start_page = page.number
                elif in_abstract:
                    if _FRONT_MATTER.match(line.text) or (heading and heading[0] == 1):
                        in_abstract = False
                    else:
                        abstract_lines.append(line.text)
                    continue
                else:
                    continue

            if heading:
                level, number, title, consumed = heading
                if consumed:
                    index += 1
                if _REFERENCES.match(title):
                    in_references = True
                    continue
                if in_references and level > 1:
                    reference_lines.append(line.text)
                    continue
                in_references = False
                sections.append(Section(title=title, kind=classify_kind(title), level=level, number=number, page_start=page.number))
                continue

            if in_references:
                reference_lines.append(line.text)
            elif sections:
                sections[-1].lines.append(line.text)

    _inherit_chapter_kinds(sections)
    if not body_started:
        # No recognisable chapter structure: keep everything that is not front matter as one section.
        fallback = Section(title="Body", kind="other", level=1, number=None, page_start=1)
        for page in pages:
            if page.number not in skipped:
                fallback.lines.extend(line.text for line in page.lines)
        sections = [fallback]

    return SegmentedDocument(
        abstract=join_lines(abstract_lines),
        sections=[s for s in sections if s.lines or s.level == 1],
        references=split_references(reference_lines),
        skipped_pages=skipped,
        body_start_page=body_start_page,
    )


def _inherit_chapter_kinds(sections: list[Section]) -> None:
    """Record each section's chapter kind; untitled-looking subsections also take it as their own."""
    chapter_kind = "other"
    for section in sections:
        if section.level == 1:
            chapter_kind = section.kind
        elif section.kind == "other":
            section.kind = chapter_kind
        section.chapter_kind = chapter_kind
