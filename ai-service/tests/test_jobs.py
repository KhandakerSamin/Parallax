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


def test_queue_position_counts_the_jobs_ahead():
    import threading

    queue = JobQueue(workers=1)
    release = threading.Event()
    first = queue.submit("u-1", lambda: release.wait(5) and {"ok": 1})
    second = queue.submit("u-2", lambda: {"ok": 2})
    third = queue.submit("u-3", lambda: {"ok": 3})
    deadline = time.time() + 5
    while first.status != "running" and time.time() < deadline:
        time.sleep(0.01)

    assert queue.position(first) is None  # running, not waiting
    assert queue.position(second) == 1  # one job ahead of it
    assert queue.position(third) == 2

    release.set()
    deadline = time.time() + 5
    while third.status != "done" and time.time() < deadline:
        time.sleep(0.01)
    assert third.status == "done"
    assert queue.position(third) is None


def test_a_job_waiting_over_an_hour_is_kept_and_old_results_are_dropped():
    import threading

    queue = JobQueue(workers=1)
    done = queue.submit("u-0", lambda: {"ok": 0})
    deadline = time.time() + 5
    while done.status != "done" and time.time() < deadline:
        time.sleep(0.01)

    release = threading.Event()
    running = queue.submit("u-1", lambda: release.wait(5) and {"ok": 1})
    waiting = queue.submit("u-2", lambda: {"ok": 2})
    two_hours_ago = time.time() - 2 * 60 * 60
    done.finished = two_hours_ago
    running.created = waiting.created = two_hours_ago

    queue.submit("u-3", lambda: {"ok": 3})  # submitting prunes the queue

    assert queue.get(done.id, "u-0") is None  # finished long ago: forgotten
    assert queue.get(running.id, "u-1") is running
    assert queue.get(waiting.id, "u-2") is waiting  # still waiting: never dropped
    release.set()
    deadline = time.time() + 5
    while waiting.status != "done" and time.time() < deadline:
        time.sleep(0.01)
    assert queue.get(waiting.id, "u-2").result == {"ok": 2}


def test_job_status_reports_the_position_only_while_queued(client, monkeypatch):
    import threading

    release = threading.Event()
    real_submit = routes.queue.submit

    def slow_first(owner, work):
        return real_submit(owner, lambda: (release.wait(5), work())[1])

    monkeypatch.setattr(routes.queue, "submit", slow_first)
    files = {"file": ("report.pdf", pdf_bytes(FARMING), "application/pdf")}
    a = {"X-Parallax-Ticket": ticket("u-1")}
    b = {"X-Parallax-Ticket": ticket("u-2")}
    first = client.post("/jobs", files=files, headers=a).json()
    second = client.post("/jobs", files=files, headers=b).json()

    waiting = client.get(f"/jobs/{second['id']}", headers=b).json()
    assert waiting["status"] == "queued" and waiting["position"] == 1

    release.set()
    done = wait(lambda: client.get(f"/jobs/{second['id']}", headers=b).json())
    assert done["status"] == "done" and "position" not in done
    assert wait(lambda: client.get(f"/jobs/{first['id']}", headers=a).json())["status"] == "done"
