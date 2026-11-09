"""Analysis endpoints, with the AI service replaced by a fake httpx.post."""

import httpx
import pytest

from tests.conftest import STRONG_PASSWORD

ANALYSIS = "/api/v1/analysis"
TEXT = " ".join(["Parallax compares Bangla and English reports for potential similarity."] * 5)
RESULT = {"document": {"id": "x", "words": 50}, "summary": {"overall": 0.4}, "matches": []}


@pytest.fixture
def signed_in(client, registered):
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": registered["email"], "password": STRONG_PASSWORD, "remember": False},
    )
    assert response.status_code == 200
    return client


@pytest.fixture
def ai(monkeypatch):
    """Records calls to the AI service and answers with `ai["response"]`."""
    state = {"calls": [], "response": httpx.Response(200, json=RESULT)}

    def fake_post(url, **kwargs):
        state["calls"].append((url, kwargs))
        if isinstance(state["response"], Exception):
            raise state["response"]
        return state["response"]

    monkeypatch.setattr(httpx, "post", fake_post)
    return state


def test_requires_sign_in(client, ai):
    assert client.post(f"{ANALYSIS}/text", json={"text": TEXT}).status_code == 401
    assert ai["calls"] == []


def test_text_is_forwarded_and_the_result_returned(signed_in, ai):
    response = signed_in.post(f"{ANALYSIS}/text", json={"text": TEXT, "title": "My report"})

    assert response.status_code == 200
    assert response.json() == RESULT
    url, kwargs = ai["calls"][0]
    assert url == "http://localhost:8001/analyze/text"
    assert kwargs["json"] == {"text": TEXT, "title": "My report"}


def test_rejects_text_that_is_too_short(signed_in, ai):
    response = signed_in.post(f"{ANALYSIS}/text", json={"text": "only a few words"})
    assert response.status_code == 422
    assert response.json()["field"] == "text"
    assert ai["calls"] == []


def test_pdf_is_forwarded(signed_in, ai):
    files = {"file": ("report.pdf", b"%PDF-1.7 fake", "application/pdf")}
    response = signed_in.post(f"{ANALYSIS}/pdf", files=files)

    assert response.status_code == 200
    url, kwargs = ai["calls"][0]
    assert url == "http://localhost:8001/analyze"
    assert kwargs["files"]["file"][0] == "report.pdf"


def test_rejects_files_that_are_not_pdfs(signed_in, ai):
    files = {"file": ("notes.txt", b"plain text", "text/plain")}
    response = signed_in.post(f"{ANALYSIS}/pdf", files=files)
    assert response.status_code == 415
    assert ai["calls"] == []


def test_rejects_oversized_files(signed_in, ai, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "max_upload_mb", 1)
    files = {"file": ("big.pdf", b"%PDF" + b"0" * (1024 * 1024), "application/pdf")}
    assert signed_in.post(f"{ANALYSIS}/pdf", files=files).status_code == 413


def test_passes_on_the_ai_service_rejection(signed_in, ai):
    ai["response"] = httpx.Response(422, json={"detail": "The PDF could not be read."})
    files = {"file": ("broken.pdf", b"%PDF broken", "application/pdf")}
    response = signed_in.post(f"{ANALYSIS}/pdf", files=files)
    assert response.status_code == 422
    assert response.json()["message"] == "The PDF could not be read."


@pytest.mark.parametrize(
    "failure",
    [
        httpx.ConnectError("refused"),
        httpx.ReadTimeout("slow"),
        httpx.Response(503, json={"detail": "No index"}),
        httpx.Response(500, text="boom"),
    ],
)
def test_reports_the_service_as_unavailable(signed_in, ai, failure):
    ai["response"] = failure
    response = signed_in.post(f"{ANALYSIS}/text", json={"text": TEXT})
    assert response.status_code == 503
    assert response.json()["message"]
