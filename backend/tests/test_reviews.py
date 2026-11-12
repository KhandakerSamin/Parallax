"""Reviewers see every report and record decisions; students see only their own, plus the decision."""

import httpx
import pytest

from app.models import Role, User
from tests.conftest import STRONG_PASSWORD
from tests.test_reports import TEXT, result


@pytest.fixture
def ai(monkeypatch):
    state = {"result": result()}
    monkeypatch.setattr(httpx, "post", lambda url, **kw: httpx.Response(200, json=state["result"]))
    return state


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
    assert client.post("/api/v1/auth/register", json=body).status_code == 201  # also signs in
    return body


def sign_in(client, email):
    client.cookies.clear()
    response = client.post(
        "/api/v1/auth/login", json={"identifier": email, "password": STRONG_PASSWORD, "remember": False}
    )
    assert response.status_code == 200


def analyze(client, title):
    response = client.post("/api/v1/analysis/text", json={"text": TEXT, "title": title})
    assert response.status_code == 200
    return response.json()["report_id"]


@pytest.fixture
def setup(client, ai, db):
    """Two students with one report each, and a reviewer."""
    register(client, "Nusrat Jahan", "nusrat@diu.edu.bd", "221-35-123")
    first = analyze(client, "Nusrat's report")
    register(client, "Rahim Uddin", "rahim@diu.edu.bd", "221-35-456")
    ai["result"] = result(overall=0.9)
    second = analyze(client, "Rahim's report")
    register(client, "Dr. Reviewer", "reviewer@diu.edu.bd", "STAFF-0042", role="reviewer")
    return {"first": first, "second": second}


def test_the_queue_lists_every_report_most_similar_first(client, setup):
    reports = client.get("/api/v1/reviews").json()["reports"]
    assert [r["title"] for r in reports] == ["Rahim's report", "Nusrat's report"]
    assert reports[0]["ownerName"] == "Rahim Uddin"
    assert reports[0]["ownerUniversityId"] == "221-35-456"
    assert reports[0]["reviewStatus"] == "pending"
    assert reports[0]["userId"] and reports[0]["userId"] != reports[1]["userId"]


def test_a_reviewer_records_a_decision_and_the_student_sees_it(client, setup):
    response = client.put(
        f"/api/v1/reports/{setup['second']}/review",
        json={"status": "follow_up", "note": "  Please discuss chapter 2 with your supervisor.  "},
    )
    assert response.status_code == 200
    report = response.json()["report"]
    assert report["reviewStatus"] == "follow_up"
    assert report["reviewNote"] == "Please discuss chapter 2 with your supervisor."
    assert report["reviewerName"] == "Dr. Reviewer"
    assert report["reviewedAt"]

    sign_in(client, "rahim@diu.edu.bd")
    own = client.get(f"/api/v1/reports/{setup['second']}").json()["report"]
    assert own["reviewStatus"] == "follow_up"
    assert client.get("/api/v1/reports").json()["reports"][0]["reviewerName"] == "Dr. Reviewer"


def test_reviewed_reports_move_behind_undecided_ones(client, setup):
    client.put(f"/api/v1/reports/{setup['second']}/review", json={"status": "cleared"})
    titles = [r["title"] for r in client.get("/api/v1/reviews").json()["reports"]]
    assert titles == ["Nusrat's report", "Rahim's report"]


def test_the_queue_can_be_filtered(client, setup):
    client.put(f"/api/v1/reports/{setup['second']}/review", json={"status": "cleared"})
    pending = client.get("/api/v1/reviews", params={"status": "pending"}).json()["reports"]
    assert [r["title"] for r in pending] == ["Nusrat's report"]
    high = client.get("/api/v1/reviews", params={"level": "high"}).json()["reports"]
    assert {r["level"] for r in high} == {"high"}


def test_a_decision_can_be_reset_to_pending(client, setup):
    client.put(f"/api/v1/reports/{setup['first']}/review", json={"status": "cleared", "note": "fine"})
    report = client.put(f"/api/v1/reports/{setup['first']}/review", json={"status": "pending"}).json()["report"]
    assert (report["reviewStatus"], report["reviewerName"], report["reviewedAt"]) == ("pending", None, None)


def test_students_cannot_review_or_see_the_queue(client, setup):
    sign_in(client, "nusrat@diu.edu.bd")
    assert client.get("/api/v1/reviews").status_code == 403
    assert client.put(f"/api/v1/reports/{setup['first']}/review", json={"status": "cleared"}).status_code == 403
    # ...and still cannot open someone else's report.
    assert client.get(f"/api/v1/reports/{setup['second']}").status_code == 404


def test_reviewers_can_open_but_not_delete_a_students_report(client, setup):
    assert client.get(f"/api/v1/reports/{setup['first']}").status_code == 200
    assert client.delete(f"/api/v1/reports/{setup['first']}").status_code == 404


def test_an_unknown_decision_is_rejected(client, setup):
    response = client.put(f"/api/v1/reports/{setup['first']}/review", json={"status": "plagiarism"})
    assert response.status_code == 400  # validation errors are 400 across this API


def test_admins_are_reviewers_too(client, setup, db):
    admin = db.query(User).filter_by(email="reviewer@diu.edu.bd").one()
    admin.role = Role.admin
    db.commit()
    assert client.get("/api/v1/reviews").status_code == 200
