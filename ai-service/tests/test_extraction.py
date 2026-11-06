"""Tests for PDF extraction, using a small synthetic DIU-style report built with PyMuPDF."""

from __future__ import annotations

import pymupdf
import pytest

from app.extraction.document import extract_document
from app.extraction.pdf_reader import read_pdf
from app.extraction.sections import classify_kind, join_lines, split_references

FOOTER = "©Daffodil International University"
BODY = "This chapter explains how the attendance system recognises faces in classroom images."

# Each page: list of (text, size, bold).
PAGES: list[list[tuple[str, float, bool]]] = [
    [("Smart Attendance System", 20, True), ("Submitted By", 16, True), ("Rahim Uddin", 14, False)],
    [("STUDENT'S DECLARATION", 16, True), ("I hereby declare that this work is my own.", 12, False)],
    [
        ("TABLE OF CONTENTS", 14, True),
        ("CHAPTER 1 INTRODUCTION ........ 1", 12, False),
        ("1.1 Background ........ 1", 12, False),
        ("CHAPTER 2 METHODOLOGY ........ 3", 12, False),
        ("2.1 Dataset ........ 3", 12, False),
        ("CHAPTER 3 RESULTS ........ 5", 12, False),
        ("REFERENCES ........ 7", 12, False),
    ],
    [
        ("ABSTRACT", 14, True),
        ("Manual attendance wastes class time. We propose a face recognition", 12, False),
        ("system that marks attendance automatically.", 12, False),
    ],
    [
        ("CHAPTER 1", 16, True),
        ("INTRODUCTION", 16, True),
        ("1.1 Background", 12, True),
        ("Taking attendance by hand is slow and error-prone. Re-", 12, False),
        ("searchers have proposed automated alternatives.", 12, False),
    ],
    [
        ("CHAPTER 2", 16, True),
        ("METHODOLOGY", 16, True),
        ("2.1 Dataset", 12, True),
        (BODY, 12, False),
        ("2.2 Model Architecture", 12, True),
        ("We fine-tune a convolutional network on student photos.", 12, False),
    ],
    [
        ("CHAPTER 3", 16, True),
        ("RESULTS AND DISCUSSION", 16, True),
        ("The model reached high accuracy on the test set.", 12, False),
        ("REFERENCES", 14, True),
        ("[1] A. Author, Face recognition at scale, IEEE Access, 2021.", 12, False),
        ("[2] B. Writer, Attendance systems: a survey, Journal of Systems,", 12, False),
        ("2020.", 12, False),
    ],
    [
        ("ORIGINALITY REPORT", 14, True),
        ("12% SIMILARITY INDEX", 12, False),
        ("PRIMARY SOURCES", 12, False),
        ("Exclude quotes Off", 10, False),
    ],
]


@pytest.fixture(scope="module")
def report_pdf(tmp_path_factory):
    path = tmp_path_factory.mktemp("pdf") / "report.pdf"
    doc = pymupdf.open()
    for number, lines in enumerate(PAGES, start=1):
        page = doc.new_page()
        y = 72
        for text, size, bold in lines:
            page.insert_text((72, y), text, fontsize=size, fontname="hebo" if bold else "helv")
            y += size * 1.8
        page.insert_text((72, 800), FOOTER, fontsize=9, fontname="helv")
        page.insert_text((300, 820), str(number), fontsize=9, fontname="helv")
    doc.save(path)
    doc.close()
    return path


# ── pdf_reader ──────────────────────────────────────────────


def test_reader_removes_running_footer_and_page_numbers(report_pdf):
    content = read_pdf(report_pdf)
    all_text = "\n".join(page.text for page in content.pages)
    assert FOOTER not in all_text
    assert not any(line.text.isdigit() for page in content.pages for line in page.lines)
    assert content.body_font_size == 12


def test_reader_keeps_font_hints(report_pdf):
    content = read_pdf(report_pdf)
    heading = next(line for page in content.pages for line in page.lines if line.text == "CHAPTER 2")
    assert heading.bold
    assert heading.size == 16


# ── extract_document ────────────────────────────────────────


@pytest.fixture(scope="module")
def document(report_pdf):
    return extract_document(report_pdf, doc_id="demo")


def test_skips_template_pages(document):
    text = document.body_text + document.abstract
    assert "hereby declare" not in text
    assert "........" not in text
    assert "SIMILARITY INDEX" not in text
    assert "Submitted By" not in text


def test_finds_abstract(document):
    assert document.abstract.startswith("Manual attendance wastes class time.")
    assert "automatically" in document.abstract


def test_finds_chapters_in_order(document):
    chapters = [s for s in document.sections if s.level == 1]
    assert [c.title for c in chapters] == ["INTRODUCTION", "METHODOLOGY", "RESULTS AND DISCUSSION"]
    assert document.outline == ["introduction", "methodology", "results"]


def test_subsections_keep_their_chapter_kind(document):
    dataset = next(s for s in document.sections if s.number == "2.1")
    assert dataset.title == "Dataset"
    assert dataset.chapter_kind == "methodology"
    assert BODY in dataset.text


def test_repairs_words_hyphenated_across_lines(document):
    background = next(s for s in document.sections if s.number == "1.1")
    assert "Researchers have proposed" in background.text


def test_splits_references(document):
    assert document.references == [
        "[1] A. Author, Face recognition at scale, IEEE Access, 2021.",
        "[2] B. Writer, Attendance systems: a survey, Journal of Systems, 2020.",
    ]


def test_stats_and_flags(document):
    assert document.language == "en"
    assert document.stats["chapters"] == 3
    assert document.stats["references"] == 2
    assert "little_text" in document.flags  # the synthetic report is tiny
    assert "no_abstract" not in document.flags
    assert document.to_dict()["outline"] == document.outline


# ── helpers ─────────────────────────────────────────────────


def test_join_lines_repairs_line_break_hyphens():
    assert join_lines(["state-of-the-", "art model"]) == "state-of-the-art model"
    assert join_lines(["recog-", "nition works"]) == "recognition works"


@pytest.mark.parametrize(
    ("title", "kind"),
    [
        ("LITERATURE REVIEW", "background"),
        ("Proposed Methodology", "methodology"),
        ("Experimental Results", "results"),
        ("Conclusion and Future Work", "conclusion"),
        ("Software Requirement Specification", "requirements"),
        ("Acknowledgement", "other"),
    ],
)
def test_classify_kind(title, kind):
    assert classify_kind(title) == kind


def test_split_unnumbered_references():
    lines = [
        "Ahmed, M., & Rahman, K. (2021). Ensemble learning for phishing",
        "detection. International Journal, 184(15), 22–30.",
        "Smith, J. (2019). Deep learning. MIT Press.",
    ]
    assert len(split_references(lines)) == 2


def test_numbered_chapter_without_the_word_chapter():
    from app.extraction.pdf_reader import Line
    from app.extraction.sections import match_heading

    assert match_heading(Line("1. INTRODUCTION", 12, True), None, 12) == (1, "1", "INTRODUCTION", False)
    assert match_heading(Line("2. Literature Review", 12, True), None, 12)[0] == 1
    # A plain numbered list item stays body text.
    assert match_heading(Line("1. The system stores every record.", 12, False), None, 12) is None


def test_legacy_bangla_font_marks():
    from app.extraction.document import _LEGACY_BANGLA

    assert len(_LEGACY_BANGLA.findall("Avgv‡`i †`k evsjv‡`k")) >= 3
    assert _LEGACY_BANGLA.findall("The café © 2024 costs ±5 units.") == []
