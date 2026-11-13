import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient

from app import security
from app.api import routes
from app.main import app
from tests.test_analyze import SURGERY
from tests.test_api import engine  # noqa: F401  (fixture)

SECRET = "test-shared-secret"


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def make_token(payload: dict, purpose: str, secret: str = SECRET) -> str:
    """What the backend's app/core/signing.py produces."""
    body = b64(json.dumps(payload, separators=(",", ":")).encode())
    mac = b64(hmac.new(secret.encode(), f"{purpose}.{body}".encode(), hashlib.sha256).digest())
    return f"{body}.{mac}"


def ticket(sub="user-1", ttl=600, secret=SECRET) -> str:
    return make_token({"sub": sub, "exp": int(time.time()) + ttl}, security.TICKET_PURPOSE, secret)


@pytest.fixture
def locked(monkeypatch, engine):  # noqa: F811
    monkeypatch.setenv("AI_SHARED_SECRET", SECRET)
    monkeypatch.setattr(routes, "get_engine", lambda: engine)
    return TestClient(app)


@pytest.fixture
def secret(monkeypatch):
    monkeypatch.setenv("AI_SHARED_SECRET", SECRET)


def test_a_genuine_ticket_is_read(secret):
    assert security.read_ticket(ticket())["sub"] == "user-1"


@pytest.mark.parametrize(
    "token",
    [None, "", "garbage", ticket(ttl=-5), ticket(secret="someone-else"), ticket().replace(".", "x.", 1)],
)
def test_bad_tickets_are_rejected(secret, token):
    assert security.read_ticket(token) is None


def test_the_digest_survives_a_browser_round_trip():
    result = {"summary": {"overall": 1.0, "lexical": 0.25}, "matches": [{"overall": 0.5, "words": 3}]}
    # A browser's JSON.stringify writes 1.0 as 1.
    from_browser = json.loads(json.dumps(result).replace("1.0", "1"))
    assert security.digest(result) == security.digest(from_browser)
    assert security.digest(result) != security.digest({**result, "notes": ["edited"]})


def test_analysis_is_locked_without_a_key_or_ticket(locked):
    assert locked.post("/analyze/text", json={"text": SURGERY}).status_code == 401


def test_the_backend_key_unlocks_analysis(locked):
    response = locked.post("/analyze/text", json={"text": SURGERY}, headers={"X-Parallax-Key": SECRET})
    assert response.status_code == 200


def test_a_ticket_unlocks_analysis_and_the_result_is_signed_for_its_user(locked):
    response = locked.post("/analyze/text", json={"text": SURGERY}, headers={"X-Parallax-Ticket": ticket("u-42")})
    assert response.status_code == 200
    body = response.json()
    signature = body.pop("signature")
    payload_part, mac = signature.split(".")
    payload = json.loads(base64.urlsafe_b64decode(payload_part + "=" * (-len(payload_part) % 4)))
    assert payload["sub"] == "u-42"
    assert payload["sha"] == security.digest(body)
    expected = b64(
        hmac.new(SECRET.encode(), f"{security.RESULT_PURPOSE}.{payload_part}".encode(), hashlib.sha256).digest()
    )
    assert mac == expected


def test_health_stays_open(locked):
    assert locked.get("/health").status_code == 200
