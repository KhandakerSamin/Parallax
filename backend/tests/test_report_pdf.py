"""The downloadable PDF report: same access as the report page, a real PDF, no corpus authors."""

import httpx
import pytest

from app.services import report_pdf
from tests.conftest import STRONG_PASSWORD

TEXT = " ".join(["মেশিন লার্নিংয়ে ডেটা ভারসাম্যহীনতা একটি সাধারণ সমস্যা, and Parallax compares reports."] * 4)

RESULT = {
    "document": {"id": "submission", "title": None, "words": 75, "passages": 2, "language": "bn", "flags": []},
    "summary": {"overall": 0.62, "lexical_coverage": 0.1, "semantic_coverage": 0.62, "level": "high", "hybrid": 0.41},
    "matches": [
        {
            "source": {
                "id": "14111",
                "title": "Enhancing the Prediction of IL-4 Inducing Peptides",
                "authors": ["Secret, Corpus Author"],
                "supervisor": "Hidden Supervisor",
                "year": "2024",
                "type": "Thesis",
                "url": "https://dspace.daffodilvarsity.edu.bd/handle/123456789/14111",
            },
            "overall": 0.62,
            "hybrid": 0.41,
            "scores": {"lexical": 0.0, "semantic": 1.0, "concept": 0.22, "structural": 0.0},
            "evidence": [
                {
                    "perspective": "semantic",
                    "score": 0.86,
                    "submitted": {"text": "মেশিন লার্নিংয়ে ডেটা ভারসাম্যহীনতা একটি সাধারণ সমস্যা", "section": ""},
                    "source": {
                        "text": "In machine learning, data imbalance is a common problem.",
                        "section": "Data Balance",
                    },
                }
            ],
            "shared_terms": ["il-4", "adasyn"],
            "shared_headings": [{"submitted": "Data Balance", "source": "Data Balance"}],
        }
    ],
    "corpus": {"documents": 1919, "passages": 209386},
    "weights": {"lexical": 0.2, "semantic": 0.35, "concept": 0.25, "structural": 0.2},
    "notes": [],
}


@pytest.fixture
def ai(monkeypatch):
    monkeypatch.setattr(httpx, "post", lambda url, **kw: httpx.Response(200, json=RESULT))


def register(client, name, email, university_id, role="student"):
    client.cookies.clear()
    body = {
        "name": name,
        "email": email,
        "universityId": university_id,
        "role": role,
        "department": "Software Engineering",
        "password": STRONG_PASSWORD,
    }
    assert client.post("/api/v1/auth/register", json=body).status_code == 201


def sign_in(client, email):
    client.cookies.clear()
    response = client.post("/api/v1/auth/login", json={"identifier": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200


@pytest.fixture
def report_id(client, ai):
    register(client, "Nusrat Jahan", "nusrat@diu.edu.bd", "221-35-123")
    response = client.post("/api/v1/analysis/text", json={"text": TEXT, "title": "ডেটা ভারসাম্যহীনতা"})
    assert response.status_code == 200
    return response.json()["report_id"]


def pdf_url(report_id: str) -> str:
    return f"/api/v1/reports/{report_id}/pdf"


def test_owner_downloads_a_pdf(client, report_id):
    response = client.get(pdf_url(report_id))
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
    disposition = response.headers["content-disposition"]
    assert disposition.startswith("attachment;")
    assert 'filename="Parallax-Report_report_' in disposition  # a Bangla title has no ASCII slug
    assert response.headers["cache-control"] == "private, no-store"


def test_reviewer_downloads_any_report(client, report_id):
    register(client, "Dr. Reviewer", "reviewer@diu.edu.bd", "STAFF-0042", role="reviewer")
    assert client.get(pdf_url(report_id)).status_code == 200


def test_another_student_gets_not_found(client, report_id):
    register(client, "Other Student", "other@diu.edu.bd", "221-35-999")
    response = client.get(pdf_url(report_id))
    assert response.status_code == 404
    assert response.json()["message"] == "This report does not exist or was deleted."


def test_signed_out_gets_401(client, report_id):
    client.cookies.clear()
    assert client.get(pdf_url(report_id)).status_code == 401


def test_missing_report_gets_not_found(client, report_id):
    assert client.get(pdf_url("no-such-report")).status_code == 404


def test_pdf_never_prints_corpus_authors(monkeypatch):
    # Record every string drawn on a page (the PDF itself holds glyph IDs, not searchable text).
    from fpdf import FPDF

    drawn: list[str] = []
    for method in ("cell", "multi_cell", "text"):
        original = getattr(FPDF, method)

        def spy(self, *args, _original=original, _method=method, **kwargs):
            text = kwargs.get("text")
            if text is None:
                text = args[2] if _method == "text" and len(args) > 2 else args[2] if len(args) > 2 else ""
            drawn.append(str(text))
            return _original(self, *args, **kwargs)

        monkeypatch.setattr(FPDF, method, spy)

    context = report_pdf.ReportContext(
        report_id="r1",
        title="ডেটা ভারসাম্যহীনতা",
        source_kind="text",
        created_at=None,
        owner_name="Nusrat Jahan",
        owner_university_id="221-35-123",
        owner_department="Software Engineering",
        owner_role="student",
        review_status="follow_up",
        review_note="Please cite the 2024 thesis.",
        reviewer_name="Dr. Reviewer",
        reviewed_at=None,
        result=RESULT,
        report_url="https://example.test/dashboard/reports/r1",
    )
    pdf = report_pdf.render(context)
    assert pdf.startswith(b"%PDF")
    everything = "\n".join(drawn)
    assert "Enhancing the Prediction of IL-4" in everything  # the source is identified by its title
    assert "Nusrat Jahan" in everything  # the student's own name is on their report
    assert "Secret" not in everything and "Corpus Author" not in everything
    assert "Hidden Supervisor" not in everything


def test_filename_and_fingerprint_are_stable():
    assert report_pdf.filename("Restaurant Management System!", None).startswith(
        "Parallax-Report_Restaurant-Management-System_"
    )
    assert report_pdf.fingerprint(RESULT) == report_pdf.fingerprint(dict(RESULT))
    assert len(report_pdf.fingerprint(RESULT).replace(" ", "")) == 16


def test_key_terms_are_matched_as_whole_words():
    marked = report_pdf._emphasise("satisfaction with tio and Tio", ["tio"])
    assert marked == "satisfaction with **tio** and **Tio**"


def _context(result=RESULT):
    return report_pdf.ReportContext(
        report_id="r1",
        title="Parallax-Demo-Report.pdf",
        source_kind="pdf",
        created_at=None,
        owner_name="Nusrat Jahan",
        owner_university_id="221-35-123",
        owner_department="Software Engineering",
        owner_role="student",
        review_status="pending",
        review_note=None,
        reviewer_name=None,
        reviewed_at=None,
        result=result,
        report_url="https://example.test/dashboard/reports/r1",
    )


def test_cover_shows_the_diu_logo_instead_of_text(monkeypatch):
    from fpdf import FPDF

    images: list[str] = []
    drawn: list[str] = []
    original_image, original_cell = FPDF.image, FPDF.cell

    def image_spy(self, name, *args, **kwargs):
        images.append(str(name))
        return original_image(self, name, *args, **kwargs)

    def cell_spy(self, *args, **kwargs):
        drawn.append(str(kwargs.get("text", args[2] if len(args) > 2 else "")))
        return original_cell(self, *args, **kwargs)

    monkeypatch.setattr(FPDF, "image", image_spy)
    monkeypatch.setattr(FPDF, "cell", cell_spy)
    report_pdf.render(_context())

    assert report_pdf.DIU_LOGO.is_file()
    assert images and images[0].endswith("diu-logo.png")
    assert "Daffodil International University" not in drawn
    assert "SE 331 Capstone" not in drawn


def test_a_long_source_title_never_overlaps_the_line_below(monkeypatch):
    from fpdf import FPDF

    long_title = (
        "Analyzing the Usability and Accessibility of Mobile Banking Applications for Elderly Users in Rural Bangladesh"
    )
    result = {
        **RESULT,
        "matches": [{**RESULT["matches"][0], "source": {**RESULT["matches"][0]["source"], "title": long_title}}],
    }
    spans: list[tuple[str, float, float]] = []
    original = FPDF.multi_cell

    def spy(self, *args, **kwargs):
        text = str(kwargs.get("text", args[2] if len(args) > 2 else ""))
        top = self.get_y()
        out = original(self, *args, **kwargs)
        spans.append((text, top, self.get_y()))
        return out

    monkeypatch.setattr(FPDF, "multi_cell", spy)
    report_pdf.render(_context(result))

    # In the source section the title is drawn, then the "year · type" line under it.
    meta = next(i for i, (text, _, _) in enumerate(spans) if text == "2024 · Thesis")
    _, title_top, title_bottom = next(s for s in reversed(spans[:meta]) if s[0] == long_title)
    assert title_bottom - title_top > 10  # the title really wraps onto a second line
    assert spans[meta][1] >= title_bottom
