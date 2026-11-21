"""The local AI stand-in answers like the real service and signs results the backend accepts."""

import json
import time

import pytest
from fastapi.testclient import TestClient
from scripts import dev_ai_stub

from app.services import analysis

SECRET = "test-shared-secret"


@pytest.fixture
def stub(monkeypatch):
    monkeypatch.setattr(analysis, "_secret", lambda: SECRET)
    return TestClient(dev_ai_stub.create_app(dev_ai_stub.SAMPLE_RESULT, 0.9, SECRET))


def upload(client, ticket):
    return client.post(
        "/jobs",
        files={"file": ("report.pdf", b"%PDF-1.4 demo", "application/pdf")},
        headers={"X-Parallax-Ticket": ticket},
    )


def test_a_job_is_queued_then_running_then_done(stub):
    headers = {"X-Parallax-Ticket": analysis.issue_ticket("user-1")}
    job = upload(stub, headers["X-Parallax-Ticket"]).json()
    assert job["status"] == "queued" and job["position"] == 1

    time.sleep(0.45)
    assert stub.get(f"/jobs/{job['id']}", headers=headers).json()["status"] == "running"

    time.sleep(0.6)
    done = stub.get(f"/jobs/{job['id']}", headers=headers).json()
    assert done["status"] == "done"
    result = {k: v for k, v in done["result"].items() if k != "signature"}
    assert analysis.verify_result(result, done["result"]["signature"], "user-1")
    assert not analysis.verify_result(result, done["result"]["signature"], "user-2")


def test_uploads_and_checks_need_a_valid_pass(stub):
    assert upload(stub, "not-a-ticket").status_code == 401
    job = upload(stub, analysis.issue_ticket("user-1")).json()
    assert stub.get(f"/jobs/{job['id']}").status_code == 401
    assert stub.get("/jobs/unknown", headers={"X-Parallax-Ticket": analysis.issue_ticket("user-1")}).status_code == 404


def test_a_saved_job_response_can_be_replayed(tmp_path):
    saved = {
        "id": "j1",
        "status": "done",
        "result": {**dev_ai_stub.SAMPLE_RESULT, "signature": "old", "report_id": "r"},
    }
    path = tmp_path / "job.json"
    path.write_text(json.dumps(saved), encoding="utf-8")
    result = dev_ai_stub.load_result(str(path))
    assert "signature" not in result and "report_id" not in result
    assert result["summary"] == dev_ai_stub.SAMPLE_RESULT["summary"]


def test_refuses_to_run_in_production(monkeypatch):
    class Production:
        app_env = "production"
        ai_shared_secret = SECRET

    monkeypatch.setattr(dev_ai_stub, "get_settings", lambda: Production())
    monkeypatch.setattr("sys.argv", ["dev_ai_stub"])
    with pytest.raises(SystemExit, match="production"):
        dev_ai_stub.main()
