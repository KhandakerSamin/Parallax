"""The downloadable similarity report: a printable A4 PDF built from a saved, verified result.

The PDF never re-runs an analysis; it lays out the result the API already saved.
Text is shaped with HarfBuzz (uharfbuzz) so Bangla conjuncts and vowel signs render
correctly, and the Hind Siliguri font (Latin + Bangla) is embedded. Corpus authors'
names are never printed: a source is identified by its title, year, type and link.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

import segno
from fpdf import FPDF

FONT_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
DIU_LOGO = FONT_DIR.parent / "diu-logo.png"
DHAKA = timezone(timedelta(hours=6), "Asia/Dhaka")  # Bangladesh has no daylight saving time

PERSPECTIVES = (
    # key, name, question, weight, print colour
    ("lexical", "Lexical", "Are the same words used?", 0.20, "#B45309"),
    ("semantic", "Semantic", "Is the same thing said, even reworded or translated?", 0.35, "#4F46E5"),
    ("concept", "Concept", "Do they share the same distinctive key terms?", 0.25, "#0F766E"),
    ("structural", "Structural", "Are the chapters and sections in the same order?", 0.20, "#BE123C"),
)
COLOUR = {key: colour for key, _, _, _, colour in PERSPECTIVES}
NAME = {key: name for key, name, _, _, _ in PERSPECTIVES}

LEVELS = {
    "high": ("High", "#B42318", "40% or more"),
    "moderate": ("Moderate", "#B54708", "15% to under 40%"),
    "low": ("Low", "#067647", "under 15%"),
}
DECISIONS = {
    "pending": "Awaiting review",
    "cleared": "No concern",
    "follow_up": "Needs follow-up",
}
DECISION_MEANING = {
    "pending": "No reviewer has recorded a decision yet.",
    "cleared": "The similarity is explained: shared topic, standard method or proper citation.",
    "follow_up": "Some passages need a conversation with the student or supervisor.",
}

INK = "#0F172A"
MUTED = "#475569"
FAINT = "#94A3B8"
LINE = "#E2E8F0"
PANEL = "#F8FAFC"
BRAND = "#4338CA"

BENGALI = re.compile(r"[ঀ-৿]")
MAX_SOURCES_TABLE = 10
MAX_SOURCE_SECTIONS = 5
MAX_PAIRS = 8


def _rgb(hex_colour: str) -> tuple[int, int, int]:
    h = hex_colour.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _tint(hex_colour: str, amount: float) -> tuple[int, int, int]:
    """Mix a colour with white: amount 0 = white, 1 = the colour."""
    r, g, b = _rgb(hex_colour)
    return tuple(round(255 - (255 - c) * amount) for c in (r, g, b))  # type: ignore[return-value]


def _pct(value: Any) -> str:
    return f"{round(_num(value) * 100)}%"


def _num(value: Any) -> float:
    return float(value) if isinstance(value, int | float) else 0.0


def _has_bangla(text: str) -> bool:
    return bool(BENGALI.search(text or ""))


def _mostly_bangla(text: str) -> bool:
    letters = [c for c in text or "" if c.isalpha()]
    return bool(letters) and sum(1 for c in letters if BENGALI.match(c)) / len(letters) > 0.5


def _clean(text: str) -> str:
    """Plain text that the markdown renderer will not misread."""
    text = re.sub(r"\s+", " ", str(text or "")).strip()
    return text.replace("**", "*").replace("__", "_").replace("--", "–")


def _dhaka(dt: datetime | None) -> str:
    if dt is None:
        return "—"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(DHAKA).strftime("%d %b %Y, %I:%M %p") + " (Asia/Dhaka)"


def fingerprint(result: dict[str, Any]) -> str:
    """The first 16 hex characters of the SHA-256 of the saved result, grouped in fours."""
    digest = hashlib.sha256(
        json.dumps(result, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    ).hexdigest()[:16]
    return " ".join(digest[i : i + 4] for i in range(0, 16, 4))


def filename(title: str, created: datetime | None, *, ascii_only: bool = False) -> str:
    """Parallax-Report_<title>_<date>.pdf. Bangla letters are kept unless `ascii_only`
    (the fallback name for browsers that ignore the UTF-8 one)."""
    allowed = r"A-Za-z0-9" if ascii_only else r"A-Za-z0-9ঀ-৿"
    slug = re.sub(rf"[^{allowed}]+", "-", title or "").strip("-")
    if len(slug) > 60:  # cut at a word boundary, never inside a Bangla letter cluster
        slug = slug[:61].rsplit("-", 1)[0] if "-" in slug[:61] else slug[:60]
    slug = slug.strip("-") or "report"
    day = (created or datetime.now(timezone.utc)).astimezone(DHAKA).strftime("%Y-%m-%d")
    return f"Parallax-Report_{slug}_{day}.pdf"


def content_disposition(title: str, created: datetime | None) -> str:
    """An attachment header that keeps a Bangla title (RFC 6266 filename*), with an ASCII fallback."""
    plain = filename(title, created, ascii_only=True)
    full = filename(title, created)
    if full == plain:
        return f'attachment; filename="{plain}"'
    return f"attachment; filename=\"{plain}\"; filename*=UTF-8''{quote(full)}"


@dataclass
class ReportContext:
    """Everything the PDF prints, gathered by the route from the saved report."""

    report_id: str
    title: str
    source_kind: str
    created_at: datetime | None
    owner_name: str
    owner_university_id: str
    owner_department: str
    owner_role: str
    review_status: str
    review_note: str | None
    reviewer_name: str | None
    reviewed_at: datetime | None
    result: dict[str, Any]
    report_url: str


class _Doc(FPDF):
    def __init__(self, ctx: ReportContext) -> None:
        super().__init__(orientation="P", unit="mm", format="A4")
        self.ctx = ctx
        self.set_margins(18, 20, 18)
        self.set_auto_page_break(True, margin=20)
        for style, weight in (("", "Regular"), ("B", "Bold")):
            self.add_font("Hind", style, str(FONT_DIR / f"HindSiliguri-{weight}.ttf"))
        self.add_font("HindSemi", "", str(FONT_DIR / "HindSiliguri-SemiBold.ttf"))
        self.add_font("HindMedium", "", str(FONT_DIR / "HindSiliguri-Medium.ttf"))
        # Bengali shaping handles Latin text too, and shapes mixed lines correctly.
        self.set_text_shaping(use_shaping_engine=True, script="beng", language="ben")
        self.set_title(f"Similarity Report: {ctx.title}")
        self.set_author("Parallax")
        self.set_creator("Parallax (SE 331 Capstone, Daffodil International University)")
        self.set_subject("Potential similarity report")

    def multi_cell(self, *args, align="L", **kwargs):  # type: ignore[override]
        """Left-aligned by default: justified text spaces Bangla and English unevenly."""
        return super().multi_cell(*args, align=align, **kwargs)

    # ----- colours and type -------------------------------------------------

    def ink(self, colour: str = INK) -> None:
        self.set_text_color(*_rgb(colour))

    def fill(self, colour: str | tuple[int, int, int]) -> None:
        self.set_fill_color(*(colour if isinstance(colour, tuple) else _rgb(colour)))

    def stroke(self, colour: str | tuple[int, int, int], width: float = 0.2) -> None:
        self.set_draw_color(*(colour if isinstance(colour, tuple) else _rgb(colour)))
        self.set_line_width(width)

    def font(self, size: float, weight: str = "regular") -> None:
        family, style = {
            "regular": ("Hind", ""),
            "medium": ("HindMedium", ""),
            "semi": ("HindSemi", ""),
            "bold": ("Hind", "B"),
        }[weight]
        self.set_font(family, style, size)

    def line_h(self, size: float, text: str = "") -> float:
        """Line height in mm: 1.5x the font size, 1.7x for Bangla."""
        return size * 0.3528 * (1.7 if _has_bangla(text) else 1.5)

    @property
    def content_w(self) -> float:
        return self.w - self.l_margin - self.r_margin

    def room(self) -> float:
        return self.page_break_trigger - self.get_y()

    def need(self, height: float) -> None:
        if self.room() < height:
            self.add_page()

    def fit(self, text: str, width: float) -> str:
        """Shorten to fit one line, ending with an ellipsis."""
        text = _clean(text)
        if self.get_string_width(text) <= width:
            return text
        while text and self.get_string_width(text + "…") > width:
            text = text[:-1]
        return text.rstrip() + "…"

    # ----- page furniture ---------------------------------------------------

    def logo(self, x: float, y: float, size: float) -> None:
        s = size / 32
        for rx, ry, colour in ((2, 9, "#B45309"), (6, 6, "#BE123C"), (10, 3, "#0F766E"), (13, 12, "#4F46E5")):
            self.fill(colour)
            self.rect(x + rx * s, y + ry * s, 17 * s, 17 * s, style="F", round_corners=True, corner_radius=4.5 * s)
        self.stroke("#FFFFFF", 2 * s)
        self.line(x + 17.5 * s, y + 20.5 * s, x + 25.5 * s, y + 20.5 * s)
        self.line(x + 17.5 * s, y + 24 * s, x + 22.5 * s, y + 24 * s)

    def header(self) -> None:
        if self.page_no() == 1:
            return
        y = 9
        self.logo(self.l_margin, y - 0.6, 6)
        self.set_xy(self.l_margin + 8, y)
        self.font(9, "semi")
        self.ink()
        self.cell(40, 5, "Similarity Report")
        self.font(9)
        self.ink(MUTED)
        title_w = self.content_w - 50
        self.set_xy(self.w - self.r_margin - title_w, y)
        self.cell(title_w, 5, self.fit(self.ctx.title, title_w), align="R")
        self.stroke(LINE, 0.25)
        self.line(self.l_margin, y + 7, self.w - self.r_margin, y + 7)
        self.set_y(20)

    def footer(self) -> None:
        y = self.h - 12
        self.stroke(LINE, 0.25)
        self.line(self.l_margin, y - 1.5, self.w - self.r_margin, y - 1.5)
        self.font(8)
        self.ink(MUTED)
        third = self.content_w / 3
        self.set_xy(self.l_margin, y)
        self.cell(third + 14, 4, "Potential similarity, not a plagiarism verdict")
        self.set_xy(self.l_margin + third + 8, y)
        self.cell(third - 8, 4, f"Report {self.ctx.report_id[:8]}", align="C")
        self.set_xy(self.l_margin + 2 * third, y)
        self.cell(third, 4, f"Page {self.page_no()} of {{nb}}", align="R")

    # ----- building blocks --------------------------------------------------

    def heading(self, text: str, size: float = 15, space_before: float = 2) -> None:
        self.need(size * 0.9 + 8)
        self.ln(space_before)
        self.font(size, "semi")
        self.ink()
        self.multi_cell(0, self.line_h(size, text) * 0.85, _clean(text), new_x="LMARGIN", new_y="NEXT")
        self.ln(1.2)

    def para(self, text: str, size: float = 10.5, colour: str = INK, markdown: bool = False) -> None:
        self.font(size)
        self.ink(colour)
        self.multi_cell(0, self.line_h(size, text), text, markdown=markdown, new_x="LMARGIN", new_y="NEXT")

    def text_height(
        self, width: float, text: str, size: float, weight: str = "regular", markdown: bool = False
    ) -> float:
        self.font(size, weight)
        return self.multi_cell(width, self.line_h(size, text), text, markdown=markdown, dry_run=True, output="HEIGHT")

    def level_shape(self, level: str, x: float, y: float, size: float, colour: str | None = None) -> None:
        """A shape per level so it never relies on colour: triangle, half circle, circle."""
        colour = colour or LEVELS.get(level, LEVELS["low"])[1]
        self.fill(colour)
        self.stroke(colour, 0.35)
        if level == "high":
            self.polygon([(x + size / 2, y), (x + size, y + size), (x, y + size)], style="F")
        elif level == "moderate":
            self.ellipse(x, y, size, size, style="D")
            pts = [(x + size / 2, y + size / 2)]
            import math

            for i in range(0, 19):
                a = math.pi / 2 + math.pi * i / 18
                pts.append((x + size / 2 + size / 2 * math.cos(a), y + size / 2 - size / 2 * math.sin(a)))
            self.polygon(pts, style="F")
        else:
            self.ellipse(x, y, size, size, style="D")
            inner = size * 0.36
            self.ellipse(x + (size - inner) / 2, y + (size - inner) / 2, inner, inner, style="F")

    def level_badge(self, level: str, x: float, y: float, size: float = 9) -> float:
        """Shape + word, e.g. a triangle and "High". Returns the width used."""
        label, colour, _ = LEVELS.get(level, LEVELS["low"])
        self.font(size, "semi")
        text_w = self.get_string_width(label)
        h = size * 0.55
        w = text_w + h + 7
        self.fill(_tint(colour, 0.12))
        self.rect(x, y, w, h + 2.6, style="F", round_corners=True, corner_radius=(h + 2.6) / 2)
        self.level_shape(level, x + 2.4, y + 1.3, h)
        self.ink(colour)
        self.set_xy(x + h + 3.6, y + 0.15)
        self.cell(text_w + 2, h + 2.4, label)
        return w

    def chips(self, words: list[str], colour: str, size: float = 8.5) -> None:
        self.font(size, "medium")
        x0, x1 = self.l_margin, self.w - self.r_margin
        x, y = x0, self.get_y()
        h = self.line_h(size) + 1.4
        for word in words:
            word = _clean(word)
            w = self.get_string_width(word) + 5
            if x + w > x1:
                x, y = x0, y + h + 1.6
                if y + h > self.page_break_trigger:
                    self.add_page()
                    y = self.get_y()
            self.fill(_tint(colour, 0.13))
            self.rect(x, y, w, h, style="F", round_corners=True, corner_radius=h / 2)
            self.ink(colour)
            self.set_xy(x + 2.5, y)
            self.cell(w - 5, h, word)
            x += w + 1.8
        self.set_xy(x0, y + h + 2)

    def bar(self, x: float, y: float, w: float, h: float, value: float, colour: str) -> None:
        self.fill("#E8EDF3")
        self.rect(x, y, w, h, style="F", round_corners=True, corner_radius=h / 2)
        if value > 0:
            self.fill(colour)
            self.rect(x, y, max(h, w * min(value, 1)), h, style="F", round_corners=True, corner_radius=h / 2)

    def box(
        self, x: float, y: float, w: float, h: float, fill: str | tuple[int, int, int] = PANEL, border: str = LINE
    ) -> None:
        self.fill(fill)
        self.stroke(border, 0.3)
        self.rect(x, y, w, h, style="DF", round_corners=True, corner_radius=2.5)


def _matches(result: dict[str, Any]) -> list[dict[str, Any]]:
    matches = [m for m in result.get("matches") or [] if isinstance(m, dict)]
    return sorted(matches, key=lambda m: _num(m.get("hybrid", m.get("overall"))), reverse=True)


def _source(match: dict[str, Any]) -> dict[str, Any]:
    return match.get("source") or {}


def _emphasise(text: str, terms: list[str]) -> str:
    """Bold the shared key terms inside a passage (markdown for fpdf2)."""
    text = _clean(text)
    words = sorted({_clean(t) for t in terms if t and len(t) > 2}, key=len, reverse=True)
    if not words:
        return text
    word = r"[\wঀ-৿]"
    pattern = re.compile(rf"(?<!{word})(?:" + "|".join(re.escape(w) for w in words) + rf")(?!{word})", re.IGNORECASE)
    return pattern.sub(lambda m: f"**{m.group(0)}**", text)


# ----- sections ------------------------------------------------------------------


def _cover(pdf: _Doc) -> None:
    ctx, result = pdf.ctx, pdf.ctx.result
    summary = result.get("summary") or {}
    document = result.get("document") or {}
    matches = _matches(result)
    level = str(summary.get("level") or "low")

    pdf.add_page()
    pdf.logo(pdf.l_margin, 18, 11)
    pdf.set_xy(pdf.l_margin + 14, 18.6)
    pdf.font(15, "semi")
    pdf.ink()
    pdf.cell(60, 6, "Parallax")
    pdf.set_xy(pdf.l_margin + 14, 24.4)
    pdf.font(8.5)
    pdf.ink(MUTED)
    pdf.cell(80, 4, "See your work from every angle.")
    logo_h = 11
    logo_w = logo_h * 550 / 145  # the logo file's aspect ratio
    pdf.image(str(DIU_LOGO), x=pdf.w - pdf.r_margin - logo_w, y=18, w=logo_w, h=logo_h)

    pdf.set_y(40)
    pdf.font(10, "semi")
    pdf.ink(BRAND)
    pdf.cell(0, 5, "SIMILARITY REPORT", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1.5)
    pdf.font(21, "semi")
    pdf.ink()
    pdf.multi_cell(0, pdf.line_h(21, ctx.title) * 0.82, _clean(ctx.title), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Metadata, two columns.
    words = int(_num(document.get("words")))
    kind = "PDF" if ctx.source_kind == "pdf" else "Pasted text"
    rows = [
        (
            "Submitted by",
            f"{ctx.owner_name} · {'Student' if ctx.owner_role == 'student' else 'Staff'} ID {ctx.owner_university_id}",
        ),
        ("Department", ctx.owner_department or "—"),
        ("Submitted on", _dhaka(ctx.created_at)),
        ("Input", f"{kind} · {words:,} words"),
        ("Report ID", ctx.report_id),
        ("Generated on", _dhaka(datetime.now(timezone.utc))),
        ("Corpus", "1,925 DIU SE and CSE reports, 2018–2025"),
        ("Passages compared", "209,386"),
        ("Language", {"en": "English", "bn": "Bangla"}.get(str(document.get("language")), "English and Bangla")),
        ("Template filtering", "On: DIU cover pages and template text ignored"),
    ]
    col_w = pdf.content_w / 2
    y = pdf.get_y()
    for i, (label, value) in enumerate(rows):
        x = pdf.l_margin + (i % 2) * col_w
        if i % 2 == 0 and i:
            y += 11
        pdf.set_xy(x, y)
        pdf.font(8)
        pdf.ink(MUTED)
        pdf.cell(col_w - 4, 4, label.upper())
        pdf.set_xy(x, y + 4)
        pdf.font(9.5, "medium")
        pdf.ink()
        pdf.cell(col_w - 4, 5.5, pdf.fit(value, col_w - 6))
    pdf.set_y(y + 15)

    # Result box.
    y = pdf.get_y()
    box_h = 46
    level_label, level_colour, level_range = LEVELS.get(level, LEVELS["low"])
    pdf.box(pdf.l_margin, y, pdf.content_w, box_h, fill=_tint(level_colour, 0.06), border=_tint(level_colour, 0.35))
    pdf.set_xy(pdf.l_margin + 7, y + 6)
    pdf.font(40, "semi")
    pdf.ink()
    pdf.cell(48, 18, _pct(summary.get("overall")))
    pdf.level_badge(level, pdf.l_margin + 8, y + 27, 9.5)
    pdf.set_xy(pdf.l_margin + 8, y + 35.5)
    pdf.font(7.8)
    pdf.ink(MUTED)
    pdf.cell(50, 4, f"{level_label}: {level_range}")

    tx = pdf.l_margin + 62
    tw = pdf.content_w - 68
    pdf.set_xy(tx, y + 7)
    pdf.font(10.5)
    pdf.ink()
    pdf.multi_cell(
        tw,
        5.3,
        "of the submitted text closely matches earlier DIU reports, by wording or meaning.",
        new_x="LEFT",
        new_y="NEXT",
    )
    pdf.ln(2)
    pdf.set_x(tx)
    pdf.font(9)
    pdf.ink(MUTED)
    pdf.cell(tw, 5, f"Matching source reports: {len(matches)}", new_x="LEFT", new_y="NEXT")
    if matches:
        top = _source(matches[0])
        detail = " · ".join(str(v) for v in (top.get("year"), top.get("type")) if v)
        pdf.set_x(tx)
        pdf.multi_cell(
            tw,
            5,
            f"Closest source: {_clean(top.get('title') or 'Untitled')}" + (f" ({detail})" if detail else ""),
            new_x="LEFT",
            new_y="NEXT",
        )
    else:
        pdf.set_x(tx)
        pdf.cell(tw, 5, "No similar report was found in the corpus.")
    pdf.set_y(y + box_h + 5)

    # Review status box.
    y = pdf.get_y()
    status = ctx.review_status if ctx.review_status in DECISIONS else "pending"
    note = _clean(ctx.review_note or "")
    note_h = pdf.text_height(pdf.content_w - 14, note, 9.5) if note else 0
    box_h = 21 + note_h + (2 if note else 0)
    pdf.box(pdf.l_margin, y, pdf.content_w, box_h)
    pdf.set_xy(pdf.l_margin + 7, y + 5)
    pdf.font(8)
    pdf.ink(MUTED)
    pdf.cell(60, 4, "REVIEWER DECISION")
    pdf.set_xy(pdf.l_margin + 7, y + 10)
    pdf.font(12, "semi")
    pdf.ink()
    pdf.cell(70, 6, DECISIONS[status])
    pdf.font(9)
    pdf.ink(MUTED)
    when = f"Decided {_dhaka(ctx.reviewed_at)}" if status != "pending" and ctx.reviewed_at else DECISION_MEANING[status]
    pdf.set_xy(pdf.l_margin + 70, y + 10.6)
    pdf.cell(pdf.content_w - 77, 5, pdf.fit(when, pdf.content_w - 77), align="R")
    if note:
        pdf.set_xy(pdf.l_margin + 7, y + 18)
        pdf.font(9.5)
        pdf.ink()
        pdf.multi_cell(pdf.content_w - 14, pdf.line_h(9.5, note), note, new_x="LMARGIN", new_y="NEXT")
    pdf.set_y(y + box_h + 5)

    # Disclaimer.
    disclaimer = (
        "Parallax reports **potential similarity**. It does not decide that anything is plagiarism. "
        "Similarity can come from a shared topic, a standard method, a properly cited source or the DIU report "
        "template. The final judgment belongs to human reviewers, who read the evidence in this report."
    )
    y = pdf.get_y()
    h = pdf.text_height(pdf.content_w - 14, disclaimer, 9.2, markdown=True) + 10
    pdf.box(pdf.l_margin, y, pdf.content_w, h, fill=_tint("#4F46E5", 0.05), border=_tint("#4F46E5", 0.25))
    pdf.set_xy(pdf.l_margin + 7, y + 5)
    pdf.font(9.2)
    pdf.ink()
    pdf.multi_cell(pdf.content_w - 14, pdf.line_h(9.2), disclaimer, markdown=True, new_x="LMARGIN", new_y="NEXT")

    if status == "pending":
        # A quiet mark in the right margin, never over the text.
        pdf.font(9, "semi")
        pdf.set_text_color(*_tint("#B54708", 0.55))
        with pdf.rotation(90, x=pdf.w - 9, y=pdf.h / 2 + 22):
            pdf.text(pdf.w - 9, pdf.h / 2 + 22, "AWAITING REVIEW")


def _findings(pdf: _Doc) -> None:
    result = pdf.ctx.result
    weights = {k: _num((result.get("weights") or {}).get(k, w)) for k, _, _, w, _ in PERSPECTIVES}
    matches = _matches(result)

    pdf.add_page()
    pdf.heading("Findings at a glance", 17, 0)

    # Legend: perspectives and levels.
    pdf.font(9.5, "semi")
    pdf.ink()
    pdf.cell(0, 6, "How to read this report", new_x="LMARGIN", new_y="NEXT")
    for key, name, question, _, colour in PERSPECTIVES:
        y = pdf.get_y()
        pdf.fill(colour)
        pdf.rect(pdf.l_margin, y + 1.6, 3, 3, style="F", round_corners=True, corner_radius=0.8)
        pdf.set_xy(pdf.l_margin + 5, y)
        pdf.font(9.2, "semi")
        pdf.ink(colour)
        pdf.cell(22, 6, name)
        pdf.font(9.2)
        pdf.ink()
        pdf.cell(118, 6, question)
        pdf.ink(MUTED)
        pdf.cell(0, 6, f"weight {round(weights[key] * 100)}%", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1.5)
    x = pdf.l_margin
    y = pdf.get_y()
    for level in ("high", "moderate", "low"):
        w = pdf.level_badge(level, x, y, 8.5)
        pdf.set_xy(x + w + 1.5, y + 0.4)
        pdf.font(8.5)
        pdf.ink(MUTED)
        rng = LEVELS[level][2]
        pdf.cell(pdf.get_string_width(rng) + 2, 5, rng)
        x += w + pdf.get_string_width(rng) + 10
    pdf.set_y(y + 9)
    pdf.para(
        "The overall score is the share of the submitted text that matches the corpus, by the stronger of wording "
        "(lexical) and meaning (semantic). The hybrid score of each source blends all four perspectives with the "
        "weights above.",
        8.8,
        MUTED,
    )
    pdf.ln(3)

    if not matches:
        pdf.para("No similar report was found in the corpus.", 10.5)
        return

    # Sources table.
    pdf.heading("Matching sources", 12.5, 1)
    cols = [
        ("#", 7, "C"),
        ("Source title", 66, "L"),
        ("Year", 12, "C"),
        ("Type", 19, "L"),
        ("Lex", 13, "R"),
        ("Sem", 13, "R"),
        ("Con", 13, "R"),
        ("Str", 13, "R"),
        ("Hybrid", 18, "R"),
    ]
    pdf.font(8, "semi")
    pdf.fill("#EEF2F7")
    pdf.ink(MUTED)
    pdf.set_x(pdf.l_margin)
    for label, w, align in cols:
        pdf.cell(w, 7, label, align=align, fill=True)
    pdf.ln(7)
    for i, match in enumerate(matches[:MAX_SOURCES_TABLE]):
        source = _source(match)
        scores = match.get("scores") or {}
        title = _clean(source.get("title") or "Untitled")
        h = max(6.5, pdf.text_height(cols[1][1] - 2, title, 8.6) + 1.5)
        pdf.need(h)
        y = pdf.get_y()
        if i % 2:
            pdf.fill("#F8FAFC")
            pdf.rect(pdf.l_margin, y, pdf.content_w, h, style="F")
        pdf.font(8.6)
        pdf.ink()
        x = pdf.l_margin
        values = [
            str(i + 1),
            None,
            str(source.get("year") or "—"),
            str(source.get("type") or "—"),
            _pct(scores.get("lexical")),
            _pct(scores.get("semantic")),
            _pct(scores.get("concept")),
            _pct(scores.get("structural")),
            _pct(match.get("hybrid", match.get("overall"))),
        ]
        for (label, w, align), value in zip(cols, values, strict=True):
            pdf.set_xy(x, y)
            if value is None:
                pdf.set_xy(x + 1, y + 0.75)
                pdf.multi_cell(w - 2, pdf.line_h(8.6, title), title)
            else:
                if label == "Hybrid":
                    pdf.font(8.6, "semi")
                pdf.cell(w, h, pdf.fit(value, w - 1), align=align)
                pdf.font(8.6)
            x += w
        pdf.set_y(y + h)
    if len(matches) > MAX_SOURCES_TABLE:
        pdf.ln(1)
        pdf.para(f"+{len(matches) - MAX_SOURCES_TABLE} more sources in the online report.", 8.5, MUTED)
    pdf.ln(4)

    # Stacked bar chart: each source's hybrid score, split by weighted perspective contribution.
    shown = matches[:MAX_SOURCES_TABLE]
    chart_h = 10 + 7.5 * len(shown) + 8
    pdf.need(chart_h + 10)
    pdf.heading("What makes up each hybrid score", 12.5, 1)
    x_label, w_label = pdf.l_margin, 54
    x_bar, w_bar = pdf.l_margin + w_label + 2, pdf.content_w - w_label - 16
    # Legend.
    lx = x_bar
    y = pdf.get_y()
    for key, name, _, _, colour in PERSPECTIVES:
        pdf.fill(colour)
        pdf.rect(lx, y + 1.3, 3, 3, style="F")
        pdf.set_xy(lx + 4, y)
        pdf.font(8)
        pdf.ink(MUTED)
        pdf.cell(pdf.get_string_width(name) + 2, 5.5, name)
        lx += pdf.get_string_width(name) + 10
    pdf.set_y(y + 8)
    for i, match in enumerate(shown):
        y = pdf.get_y()
        source = _source(match)
        scores = match.get("scores") or {}
        pdf.set_xy(x_label, y)
        pdf.font(8.2)
        pdf.ink()
        pdf.cell(w_label, 5, pdf.fit(f"{i + 1}. {source.get('title') or 'Untitled'}", w_label))
        pdf.fill("#EEF2F7")
        pdf.rect(x_bar, y + 0.8, w_bar, 3.6, style="F")
        x = x_bar
        for key, name, _, _, colour in PERSPECTIVES:
            part = weights[key] * _num(scores.get(key))
            seg = w_bar * part
            if seg > 0.05:
                pdf.fill(colour)
                pdf.rect(x, y + 0.8, seg, 3.6, style="F")
                x += seg
        pdf.set_xy(x_bar + w_bar + 1.5, y)
        pdf.font(8.2, "semi")
        pdf.cell(12, 5, _pct(match.get("hybrid", match.get("overall"))), align="R")
        pdf.set_y(y + 7.5)
    pdf.font(7.8)
    pdf.ink(MUTED)
    pdf.set_x(x_bar)
    pdf.cell(w_bar, 4, "Bar length = hybrid score (0–100%). Each colour is that perspective's weighted share.")
    pdf.ln(6)


def _source_section(pdf: _Doc, rank: int, match: dict[str, Any]) -> None:
    source = _source(match)
    scores = match.get("scores") or {}
    terms = [t for t in match.get("shared_terms") or [] if isinstance(t, str)]
    headings = [h for h in match.get("shared_headings") or [] if isinstance(h, dict)]
    evidence = [e for e in match.get("evidence") or [] if isinstance(e, dict)]

    pdf.need(60)
    pdf.ln(3)
    y = pdf.get_y()
    pdf.fill("#EEF2FF")
    pdf.rect(pdf.l_margin, y, pdf.content_w, 0.8, style="F")
    pdf.ln(3)
    pdf.font(8.5, "semi")
    pdf.ink(BRAND)
    pdf.cell(0, 5, f"SOURCE {rank}", new_x="LMARGIN", new_y="NEXT")
    pdf.font(13.5, "semi")
    pdf.ink()
    title = _clean(source.get("title") or "Untitled")
    pdf.multi_cell(pdf.content_w - 30, pdf.line_h(13.5, title) * 0.9, title, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1.2)
    title_bottom = pdf.get_y()  # a long title wraps; what follows starts below it
    top = y + 3.8
    pdf.set_xy(pdf.w - pdf.r_margin - 30, top)
    pdf.font(18, "semi")
    pdf.cell(30, 9, _pct(match.get("hybrid", match.get("overall"))), align="R")
    pdf.set_xy(pdf.w - pdf.r_margin - 30, top + 9)
    pdf.font(7.8)
    pdf.ink(MUTED)
    pdf.cell(30, 4, "hybrid score", align="R")
    pdf.set_y(max(title_bottom, top + 14))
    meta = " · ".join(str(v) for v in (source.get("year"), source.get("type")) if v)
    if meta:
        pdf.para(meta, 9, MUTED)
    pdf.ln(1.5)

    # Four small perspective bars.
    col = pdf.content_w / 4
    y = pdf.get_y()
    for i, (key, name, _, _, colour) in enumerate(PERSPECTIVES):
        x = pdf.l_margin + i * col
        pdf.set_xy(x, y)
        pdf.font(8.2, "semi")
        pdf.ink(colour)
        pdf.cell(col - 16, 4.5, name)
        pdf.font(8.2)
        pdf.ink()
        pdf.cell(12, 4.5, _pct(scores.get(key)), align="R")
        pdf.bar(x, y + 5.5, col - 5, 1.8, _num(scores.get(key)), colour)
    pdf.set_y(y + 11)

    if terms:
        pdf.font(9.5, "semi")
        pdf.ink()
        pdf.cell(0, 6, "Shared key terms", new_x="LMARGIN", new_y="NEXT")
        pdf.chips(terms[:24], COLOUR["concept"])

    if headings:
        pdf.need(16)
        pdf.font(9.5, "semi")
        pdf.ink()
        pdf.cell(0, 6, "Structure: headings both reports share, in order", new_x="LMARGIN", new_y="NEXT")
        half = (pdf.content_w - 8) / 2
        pdf.font(7.8, "semi")
        pdf.ink(MUTED)
        pdf.cell(half, 5, "YOUR REPORT")
        pdf.cell(8, 5, "")
        pdf.cell(half, 5, "MATCHED REPORT", new_x="LMARGIN", new_y="NEXT")
        for pair in headings[:14]:
            a, b = _clean(pair.get("submitted") or ""), _clean(pair.get("source") or "")
            pdf.need(6)
            y = pdf.get_y()
            pdf.font(8.8)
            pdf.ink()
            pdf.set_xy(pdf.l_margin, y)
            pdf.cell(half, 5.4, pdf.fit(a, half - 2))
            pdf.stroke(COLOUR["structural"], 0.4)
            pdf.line(pdf.l_margin + half + 1, y + 2.7, pdf.l_margin + half + 7, y + 2.7)
            pdf.set_xy(pdf.l_margin + half + 8, y)
            pdf.cell(half, 5.4, pdf.fit(b, half - 2))
            pdf.set_y(y + 5.6)
        if len(headings) > 14:
            pdf.para(f"+{len(headings) - 14} more shared headings in the online report.", 8.3, MUTED)
        pdf.ln(2)

    if evidence:
        pdf.need(30)
        pdf.font(9.5, "semi")
        pdf.ink()
        pdf.cell(0, 6, "Evidence: passages side by side", new_x="LMARGIN", new_y="NEXT")
        half = (pdf.content_w - 4) / 2
        for n, pair in enumerate(evidence[:MAX_PAIRS], start=1):
            mine, theirs = pair.get("submitted") or {}, pair.get("source") or {}
            a = _emphasise(mine.get("text") or "", terms)
            b = _emphasise(theirs.get("text") or "", terms)
            perspective = str(pair.get("perspective") or "semantic")
            pad = 3
            ha = pdf.text_height(half - 2 * pad, a, 9, markdown=True)
            hb = pdf.text_height(half - 2 * pad, b, 9, markdown=True)
            row_h = 7 + 5 + max(ha, hb) + 2 * pad
            pdf.need(row_h + 2)
            y = pdf.get_y()
            # Meta line: pair number, perspective, similarity, language crossing.
            pdf.set_xy(pdf.l_margin, y)
            pdf.font(8.2, "semi")
            pdf.ink(MUTED)
            pdf.cell(9, 5, f"#{n}")
            colour = COLOUR.get(perspective, COLOUR["semantic"])
            label = NAME.get(perspective, perspective.title())
            w = pdf.get_string_width(label) + 6
            pdf.fill(_tint(colour, 0.14))
            pdf.rect(pdf.get_x(), y + 0.3, w, 4.6, style="F", round_corners=True, corner_radius=2.3)
            pdf.ink(colour)
            pdf.cell(w, 5, label, align="C")
            pdf.ink(MUTED)
            pdf.font(8.2)
            crossing = _mostly_bangla(mine.get("text") or "") != _mostly_bangla(theirs.get("text") or "")
            extra = f"   {_pct(pair.get('score'))} similar" + (
                "   ·   Cross-language: English and Bangla" if crossing else ""
            )
            pdf.cell(80, 5, extra)
            top = y + 7
            for i, (label, part, text) in enumerate((("Your report", mine, a), ("Matched report", theirs, b))):
                x = pdf.l_margin + i * (half + 4)
                pdf.box(x, top, half, row_h - 7, fill="#FFFFFF" if i else PANEL)
                pdf.set_xy(x + pad, top + pad - 0.5)
                pdf.font(7.6, "semi")
                pdf.ink(MUTED)
                section = _clean(part.get("section") or "")
                pdf.cell(
                    half - 2 * pad,
                    4.5,
                    pdf.fit(f"{label.upper()}" + (f"  ·  {section}" if section else ""), half - 2 * pad),
                )
                pdf.set_xy(x + pad, top + pad + 4.5)
                pdf.font(9)
                pdf.ink()
                pdf.multi_cell(half - 2 * pad, pdf.line_h(9, text), text, markdown=True)
            pdf.set_y(y + row_h + 2.5)
        if len(evidence) > MAX_PAIRS:
            pdf.para(f"+{len(evidence) - MAX_PAIRS} more pairs in the online report.", 8.5, MUTED)


def _reviewer(pdf: _Doc) -> None:
    ctx = pdf.ctx
    if ctx.review_status not in ("cleared", "follow_up"):
        return
    pdf.need(40)
    pdf.heading("Reviewer decision", 14, 4)
    pdf.font(11, "semi")
    pdf.ink()
    pdf.cell(0, 6, DECISIONS[ctx.review_status], new_x="LMARGIN", new_y="NEXT")
    pdf.para(DECISION_MEANING[ctx.review_status], 9.2, MUTED)
    who = f"by {ctx.reviewer_name} " if ctx.reviewer_name else ""
    pdf.para(f"Recorded {who}on {_dhaka(ctx.reviewed_at)}", 9.2, MUTED)
    if ctx.review_note:
        pdf.ln(2)
        pdf.para(_clean(ctx.review_note), 10.5)


def _appendices(pdf: _Doc) -> None:
    pdf.add_page()
    pdf.heading("Appendix A: Method", 15, 0)
    method = [
        (
            "Lexical",
            "Compares the exact wording, sentence by sentence. A high lexical score means the same words "
            "appear in the same order, as in copied or lightly edited text.",
        ),
        (
            "Semantic",
            "Each passage is turned into a vector with LaBSE, a multilingual sentence model, so passages that "
            "say the same thing land close together even when reworded or written in another language. A passage counts "
            "only when it clearly stands out from the rest of the corpus.",
        ),
        (
            "Concept",
            "Finds the distinctive key terms of each report (weighted by how rare they are in the corpus) and "
            "measures how much of that vocabulary the two reports share.",
        ),
        (
            "Structural",
            "Compares the order of chapter and section headings, after removing the shared DIU template "
            "headings that every report has.",
        ),
    ]
    for name, text in method:
        colour = COLOUR[name.lower()]
        pdf.need(16)
        pdf.font(10.5, "semi")
        pdf.ink(colour)
        pdf.cell(0, 6, name, new_x="LMARGIN", new_y="NEXT")
        pdf.para(text, 10)
        pdf.ln(1.5)
    pdf.ln(1)
    pdf.font(10.5, "semi")
    pdf.ink()
    pdf.cell(0, 6, "Scores", new_x="LMARGIN", new_y="NEXT")
    pdf.para(
        "Hybrid score of a source = 0.20 × Lexical + 0.35 × Semantic + 0.25 × Concept + 0.20 × Structural.",
        10,
    )
    pdf.para(
        "Overall score = the share of the submitted text that matches the corpus, by the stronger of wording and meaning. "
        "It sets the level: High at 40% or more, Moderate from 15% to under 40%, Low under 15%.",
        10,
    )
    pdf.para(
        "Template filtering: cover pages, declarations, acknowledgements and other DIU template text are removed before "
        "comparing, so they never raise a score.",
        10,
    )

    pdf.heading("Appendix B: Limits", 15, 6)
    limits = [
        "The corpus holds 1,925 Software Engineering and CSE reports from DIU's DSpace repository (2018–2025). "
        "Reuse from other sources is not checked.",
        "Scanned PDFs (pictures of pages) cannot be read yet; only text-based PDFs are analysed.",
        "Common technical vocabulary can raise the concept score between reports on the same kind of project.",
        "Cross-language matches (English and Bangla) come from meaning alone and should always be read by a person.",
        "Scores show potential similarity. They are evidence for a reviewer, not a decision.",
    ]
    for item in limits:
        pdf.need(10)
        y = pdf.get_y()
        pdf.fill(MUTED)
        pdf.ellipse(pdf.l_margin + 0.6, y + 2.4, 1.4, 1.4, style="F")
        pdf.set_xy(pdf.l_margin + 4, y)
        pdf.font(10)
        pdf.ink()
        pdf.multi_cell(pdf.content_w - 4, pdf.line_h(10, item), item, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(0.8)


def _verification(pdf: _Doc) -> None:
    ctx = pdf.ctx
    pdf.need(46)
    pdf.ln(6)
    y = pdf.get_y()
    h = 38
    pdf.box(pdf.l_margin, y, pdf.content_w, h)
    qr = segno.make(ctx.report_url, error="m")
    size = 28
    rows = list(qr.matrix_iter(scale=1, border=0))
    cell = size / len(rows)
    qx, qy = pdf.w - pdf.r_margin - size - 5, y + 5
    pdf.fill(INK)
    for r, row in enumerate(rows):
        for c, dark in enumerate(row):
            if dark:
                pdf.rect(qx + c * cell, qy + r * cell, cell + 0.02, cell + 0.02, style="F")
    lines = [
        ("Report ID", ctx.report_id),
        ("Result fingerprint", f"{fingerprint(ctx.result)}  (SHA-256 of the saved result)"),
        ("Generated", _dhaka(datetime.now(timezone.utc))),
        ("Online report", ctx.report_url),
    ]
    pdf.set_xy(pdf.l_margin + 6, y + 4)
    pdf.font(8, "semi")
    pdf.ink(MUTED)
    pdf.cell(0, 4.5, "VERIFICATION", new_x="LMARGIN", new_y="NEXT")
    for label, value in lines:
        pdf.set_x(pdf.l_margin + 6)
        pdf.font(8.5)
        pdf.ink(MUTED)
        pdf.cell(32, 5.2, label)
        pdf.ink()
        pdf.cell(
            pdf.content_w - size - 50,
            5.2,
            pdf.fit(value, pdf.content_w - size - 50),
            link=ctx.report_url if label == "Online report" else "",
            new_x="LMARGIN",
            new_y="NEXT",
        )
    pdf.set_x(pdf.l_margin + 6)
    pdf.font(7.8)
    pdf.ink(MUTED)
    pdf.cell(pdf.content_w - size - 20, 5, "Opening the link requires a Parallax account with access to this report.")


def render(ctx: ReportContext) -> bytes:
    """Build the PDF and return its bytes."""
    pdf = _Doc(ctx)
    _cover(pdf)
    _findings(pdf)
    matches = _matches(ctx.result)
    if matches:
        pdf.add_page()
        pdf.heading("Sources in detail", 17, 0)
        shown = min(len(matches), MAX_SOURCE_SECTIONS)
        lead = (
            "The matching source and its evidence."
            if shown == 1
            else f"The {shown} sources with the highest hybrid score, with their evidence."
        )
        pdf.para(f"{lead} Bold words are key terms both reports share.", 9.2, MUTED)
        for rank, match in enumerate(matches[:MAX_SOURCE_SECTIONS], start=1):
            _source_section(pdf, rank, match)
    _reviewer(pdf)
    _appendices(pdf)
    _verification(pdf)
    return bytes(pdf.output())
