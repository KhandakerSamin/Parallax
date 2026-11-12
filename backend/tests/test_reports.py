"""Saved reports: every analysis is stored, listed newest first, and private to its owner."""

import httpx
import pytest

from tests.conftest import STRONG_PASSWORD

TEXT = " ".join(["Parallax compares Bangla and English reports for potential similarity."] * 5)


def result(overall=0.42, title="Smart Attendance System"):
    return {
        "document": {"id": "submission", "title": None, "words": 1200, "passages": 18},
        "summary": {"overall": overall, "hybrid": 0.3, "level": "high" if overall >= 0.4 else "low"},
        "matches": [{"source": {"id": "17039", "title": title}, "overall": overall, "evidence": []}],
    }


@pytest.fixture
def ai(monkeypatch):
    state = {"result": result()}
    monkeypatch.setattr(httpx, "post", lambda url, **kw: httpx.Response(200, json=state["result"]))
    return state


def sign_in(client, user):
    client.cookies.clear()
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": user["email"], "password": STRONG_PASSWORD, "remember": False},
    )
    assert response.status_code == 200


@pytest.fixture
def signed_in(client, registered):
    sign_in(client, registered)
    return client


def analyze(client, title="Chapter 2"):
    response = client.post("/api/v1/analysis/text", json={"text": TEXT, "title": title})
    assert response.status_code == 200
    return response.json()


def test_an_analysis_is_saved_and_returns_its_report_id(signed_in, ai):
    body = analyze(signed_in)
    assert body["report_id"]
    assert body["summary"]["overall"] == 0.42

    report = signed_in.get(f"/api/v1/reports/{body['report_id']}").json()
    assert report["report"]["title"] == "Chapter 2"
    assert report["report"]["sourceKind"] == "text"
    assert report["report"]["level"] == "high"
    assert report["report"]["matchCount"] == 1
    assert report["report"]["topSourceTitle"] == "Smart Attendance System"
    assert report["result"]["summary"]["overall"] == 0.42


def test_pdf_reports_are_named_after_the_file(signed_in, ai):
    files = {"file": ("final-report.pdf", b"%PDF-1.7 fake", "application/pdf")}
    body = signed_in.post("/api/v1/analysis/pdf", files=files).json()
    report = signed_in.get(f"/api/v1/reports/{body['report_id']}").json()["report"]
    assert report["title"] == "final-report.pdf"
    assert report["sourceKind"] == "pdf"


def test_reports_are_listed_newest_first(signed_in, ai):
    analyze(signed_in, "First")
    ai["result"] = result(overall=0.05)
    analyze(signed_in, "Second")

    reports = signed_in.get("/api/v1/reports").json()["reports"]
    assert [r["title"] for r in reports] == ["Second", "First"]
    assert reports[0]["level"] == "low"
    assert "result" not in reports[0]  # the list stays light


def test_a_report_can_be_deleted(signed_in, ai):
    report_id = analyze(signed_in)["report_id"]
    assert signed_in.delete(f"/api/v1/reports/{report_id}").status_code == 204
    assert signed_in.get(f"/api/v1/reports/{report_id}").status_code == 404
    assert signed_in.get("/api/v1/reports").json()["reports"] == []


def test_reports_are_private(client, registered, ai):
    sign_in(client, registered)
    report_id = analyze(client)["report_id"]

    other = {
        "name": "Rahim Uddin",
        "email": "rahim@diu.edu.bd",
        "universityId": "221-35-999",
        "role": "student",
        "department": "Software Engineering",
        "password": STRONG_PASSWORD,
    }
    assert client.post("/api/v1/auth/register", json=other).status_code == 201  # signs in as Rahim

    assert client.get(f"/api/v1/reports/{report_id}").status_code == 404
    assert client.delete(f"/api/v1/reports/{report_id}").status_code == 404
    assert client.get("/api/v1/reports").json()["reports"] == []


def test_reports_need_sign_in(client):
    assert client.get("/api/v1/reports").status_code == 401
    assert client.get("/api/v1/reports/anything").status_code == 401


def test_unknown_report_is_not_found(signed_in):
    response = signed_in.get("/api/v1/reports/does-not-exist")
    assert response.status_code == 404
    assert response.json()["message"]


# ----- Direct uploads: tickets and signed results ------------------------------


def signed(result_body, user_id, *, secret="dev-ai-shared-secret", ttl=3600):
    """What the AI service attaches to a result (see ai-service/app/security.py)."""
    from app.core.signing import sign
    from app.services.analysis import RESULT_PURPOSE, result_digest

    return sign(
        {"sub": user_id, "sha": result_digest(result_body)}, purpose=RESULT_PURPOSE, max_age_seconds=ttl, key=secret
    )


def my_id(client):
    return client.get("/api/v1/auth/me").json()["user"]["id"]


def test_a_ticket_is_issued_for_the_signed_in_user(signed_in):
    from app.core.signing import unsign
    from app.services.analysis import TICKET_PURPOSE

    body = signed_in.post("/api/v1/analysis/ticket").json()
    assert body["aiUrl"] == "http://localhost:8001"
    assert body["maxUploadMb"] == 25
    assert unsign(body["ticket"], purpose=TICKET_PURPOSE, key="dev-ai-shared-secret")["sub"] == my_id(signed_in)


def test_tickets_need_sign_in(client):
    assert client.post("/api/v1/analysis/ticket").status_code == 401


def test_a_signed_result_is_saved(signed_in):
    body = result(overall=1.0)  # whole floats arrive as ints from a browser
    payload = {"result": body, "signature": signed(body, my_id(signed_in)), "sourceName": "big-report.pdf"}
    response = signed_in.post("/api/v1/reports", json=payload)
    assert response.status_code == 201
    report = response.json()["report"]
    assert report["title"] == "big-report.pdf"
    assert report["level"] == "high"
    assert signed_in.get("/api/v1/reports").json()["reports"][0]["id"] == report["id"]


@pytest.mark.parametrize(
    "tamper",
    [
        lambda body, uid: (dict(body, summary={**body["summary"], "overall": 0.0}), signed(body, uid)),  # edited
        lambda body, uid: (body, signed(body, "someone-else")),  # another user's result
        lambda body, uid: (body, signed(body, uid, secret="wrong-secret")),  # forged
        lambda body, uid: (body, signed(body, uid, ttl=-1)),  # expired
    ],
)
def test_an_unverified_result_is_refused(signed_in, tamper):
    body, signature = tamper(result(), my_id(signed_in))
    response = signed_in.post("/api/v1/reports", json={"result": body, "signature": signature})
    assert response.status_code == 400
    assert signed_in.get("/api/v1/reports").json()["reports"] == []


def test_the_backend_sends_its_key_to_the_ai_service(signed_in, monkeypatch):
    seen = {}

    def fake_post(url, **kwargs):
        seen.update(kwargs.get("headers") or {})
        return httpx.Response(200, json=result())

    monkeypatch.setattr(httpx, "post", fake_post)
    analyze(signed_in)
    assert seen["X-Parallax-Key"] == "dev-ai-shared-secret"


def test_the_signature_is_not_stored(signed_in, monkeypatch):
    monkeypatch.setattr(httpx, "post", lambda url, **kw: httpx.Response(200, json={**result(), "signature": "x.y"}))
    report_id = analyze(signed_in)["report_id"]
    assert "signature" not in signed_in.get(f"/api/v1/reports/{report_id}").json()["result"]
