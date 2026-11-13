import time

import pymupdf
import pytest
from fastapi.testclient import TestClient

from app.api import routes
from app.main import app
from app.services.jobs import JobFailedError, JobQueue
from tests.test_analyze import FARMING
from tests.test_api import engine  # noqa: F401  (fixture)
from tests.test_security import SECRET, ticket


def pdf_bytes(text: str) -> bytes:
    document = pymupdf.open()
    page = document.new_page()
    page.insert_textbox(pymupdf.Rect(50, 50, 550, 800), text, fontsize=11)
    return document.tobytes()


def wait(get, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        body = get()
        if body["status"] in ("done", "failed"):
            return body
        time.sleep(0.05)
    raise AssertionError("job did not finish")


@pytest.fixture
def client(monkeypatch, engine):  # noqa: F811
    monkeypatch.setenv("AI_SHARED_SECRET", SECRET)
    monkeypatch.setattr(routes, "get_engine", lambda: engine)
    monkeypatch.setattr(routes, "queue", JobQueue())
    return TestClient(app)


def test_a_pdf_job_runs_in_the_background_and_returns_a_signed_result(client):
    headers = {"X-Parallax-Ticket": ticket("u-1")}
    files = {"file": ("report.pdf", pdf_bytes(FARMING), "application/pdf")}

    started = client.post("/jobs", files=files, headers=headers)
    assert started.status_code == 202
    assert started.json()["status"] in ("queued", "running", "done")

    job = wait(lambda: client.get(f"/jobs/{started.json()['id']}", headers=headers).json())
    assert job["status"] == "done"
    assert job["result"]["matches"][0]["source"]["id"] == "f1"
    assert job["result"]["signature"]


def test_jobs_are_private_to_their_owner(client):
    files = {"file": ("report.pdf", pdf_bytes(FARMING), "application/pdf")}
    job_id = client.post("/jobs", files=files, headers={"X-Parallax-Ticket": ticket("u-1")}).json()["id"]
    response = client.get(f"/jobs/{job_id}", headers={"X-Parallax-Ticket": ticket("someone-else")})
    assert response.status_code == 404


def test_jobs_need_a_ticket(client):
    files = {"file": ("report.pdf", pdf_bytes(FARMING), "application/pdf")}
    assert client.post("/jobs", files=files).status_code == 401


def test_an_unreadable_pdf_fails_the_job(client):
    headers = {"X-Parallax-Ticket": ticket("u-1")}
    files = {"file": ("broken.pdf", b"%PDF-1.7 not really", "application/pdf")}
    job_id = client.post("/jobs", files=files, headers=headers).json()["id"]
    job = wait(lambda: client.get(f"/jobs/{job_id}", headers=headers).json())
    assert job["status"] == "failed"
    assert job["error_status"] == 422


def test_files_are_checked_before_a_job_starts(client):
    headers = {"X-Parallax-Ticket": ticket("u-1")}
    files = {"file": ("notes.txt", b"plain text", "text/plain")}
    assert client.post("/jobs", files=files, headers=headers).status_code == 415


def test_the_queue_reports_failures_and_positions():
    q = JobQueue()

    def slow():
        time.sleep(0.3)
        return {"ok": True}

    def broken():
        raise JobFailedError(422, "nope")

    first = q.submit("a", slow)
    second = q.submit("a", broken)
    assert q.position(second) in (0, 1)
    deadline = time.time() + 5
    while second.status not in ("done", "failed") and time.time() < deadline:
        time.sleep(0.02)
    assert first.status == "done"
    assert (second.status, second.error, second.error_status) == ("failed", "nope", 422)
    assert q.get(first.id, "someone-else") is None
