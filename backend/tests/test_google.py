"""Google sign-in, with Google's token endpoint replaced by a fake."""

import base64
import json
import time
from urllib.parse import parse_qs, urlparse

import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.models import User
from app.services import google

GOOGLE = "/api/v1/auth/google"
CLIENT_ID = "test-client.apps.googleusercontent.com"


def make_id_token(**overrides) -> str:
    claims = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "exp": int(time.time()) + 300,
        "sub": "google-sub-123",
        "email": "rahim@diu.edu.bd",
        "email_verified": True,
        "name": "Rahim Uddin",
        **overrides,
    }
    body = base64.urlsafe_b64encode(json.dumps(claims).encode()).rstrip(b"=").decode()
    return f"eyJhbGciOiJSUzI1NiJ9.{body}.signature"


@pytest.fixture
def google_on(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "google_client_id", CLIENT_ID)
    monkeypatch.setattr(settings, "google_client_secret", "test-secret")
    tokens = {"id_token": make_id_token()}

    def fake_exchange(code, verifier):
        assert code == "auth-code"
        assert verifier
        return tokens["id_token"]

    monkeypatch.setattr(google, "exchange_code", fake_exchange)
    return tokens


def start(client, next_path="/dashboard"):
    response = client.get(GOOGLE, params={"next": next_path}, follow_redirects=False)
    assert response.status_code == 302
    return parse_qs(urlparse(response.headers["location"]).query)


def callback(client, state, code="auth-code"):
    return client.get(f"{GOOGLE}/callback", params={"code": code, "state": state}, follow_redirects=False)


def location(response) -> str:
    url = urlparse(response.headers["location"])
    return f"{url.path}?{url.query}" if url.query else url.path


# ----- start -----------------------------------------------------------------


def test_reports_unavailable_without_credentials(client):
    response = client.get(GOOGLE, follow_redirects=False)
    assert location(response) == "/sign-in?error=google_unavailable"


def test_start_redirects_to_google_with_pkce(client, google_on):
    response = client.get(GOOGLE, follow_redirects=False)
    url = urlparse(response.headers["location"])
    query = parse_qs(url.query)

    assert url.netloc == "accounts.google.com"
    assert query["client_id"] == [CLIENT_ID]
    assert query["redirect_uri"] == ["http://localhost:3000/api/v1/auth/google/callback"]
    assert query["code_challenge_method"] == ["S256"]
    assert query["scope"] == ["openid email profile"]
    assert query["state"][0]
    assert "parallax_oauth_state=" in response.headers["set-cookie"]
    assert "HttpOnly" in response.headers["set-cookie"]


# ----- callback ----------------------------------------------------------------


def test_existing_account_is_linked_and_signed_in(client, registered, google_on, db):
    google_on["id_token"] = make_id_token(email=registered["email"])
    query = start(client, "/dashboard?tab=reports")

    response = callback(client, query["state"][0])

    assert location(response) == "/dashboard?tab=reports"
    assert client.get("/api/v1/auth/me").json()["user"]["email"] == registered["email"]
    user = db.scalar(select(User).where(User.email == registered["email"]))
    db.refresh(user)
    assert user.google_sub == "google-sub-123"


def test_linked_account_signs_in_by_google_id(client, registered, google_on):
    google_on["id_token"] = make_id_token(email=registered["email"])
    callback(client, start(client)["state"][0])
    client.cookies.clear()

    # Same Google account, even if its email were to change.
    google_on["id_token"] = make_id_token(email="renamed@diu.edu.bd")
    response = callback(client, start(client)["state"][0])
    assert location(response) == "/dashboard"


def test_new_person_finishes_sign_up(client, google_on):
    response = callback(client, start(client)["state"][0])
    assert location(response) == "/sign-up/google"

    pending = client.get(f"{GOOGLE}/pending")
    assert pending.json() == {"email": "rahim@diu.edu.bd", "name": "Rahim Uddin"}

    done = client.post(
        f"{GOOGLE}/complete",
        json={"universityId": "221-35-456", "role": "student", "department": "Software Engineering"},
    )
    assert done.status_code == 201
    assert done.json()["user"]["email"] == "rahim@diu.edu.bd"
    assert client.get("/api/v1/auth/me").json()["user"]["universityId"] == "221-35-456"

    # The pending sign-up is single-use.
    assert client.get(f"{GOOGLE}/pending").status_code == 401


def test_google_only_account_cannot_use_password_login(client, google_on):
    callback(client, start(client)["state"][0])
    client.post(
        f"{GOOGLE}/complete",
        json={"universityId": "221-35-456", "role": "student", "department": "Software Engineering"},
    )
    response = client.post(
        "/api/v1/auth/login", json={"identifier": "rahim@diu.edu.bd", "password": "Anything#123"}
    )
    assert response.status_code == 401


def test_complete_rejects_taken_university_id(client, registered, google_on):
    callback(client, start(client)["state"][0])
    response = client.post(
        f"{GOOGLE}/complete",
        json={"universityId": registered["universityId"], "role": "student", "department": "Other"},
    )
    assert response.status_code == 409
    assert response.json()["field"] == "universityId"


def test_complete_validates_profile(client, google_on):
    callback(client, start(client)["state"][0])
    response = client.post(
        f"{GOOGLE}/complete", json={"universityId": "221-35-456", "role": "admin", "department": "Other"}
    )
    assert response.status_code == 400
    assert response.json()["field"] == "role"


def test_complete_requires_pending_sign_up(client):
    response = client.post(
        f"{GOOGLE}/complete", json={"universityId": "221-35-456", "role": "student", "department": "Other"}
    )
    assert response.status_code == 401


@pytest.mark.parametrize(
    ("claims", "error"),
    [
        ({"email": "rahim@gmail.com"}, "google_domain"),
        ({"email_verified": False}, "google_failed"),
        ({"aud": "someone-else"}, "google_failed"),
        ({"iss": "https://evil.example"}, "google_failed"),
        ({"exp": int(time.time()) - 10}, "google_failed"),
    ],
)
def test_rejects_unacceptable_tokens(client, google_on, claims, error):
    google_on["id_token"] = make_id_token(**claims)
    response = callback(client, start(client)["state"][0])
    assert location(response) == f"/sign-in?error={error}"
    assert client.get("/api/v1/auth/me").json() == {"user": None}


def test_rejects_wrong_or_missing_state(client, google_on):
    start(client)
    assert location(callback(client, "forged-state")) == "/sign-in?error=google_failed"
    client.cookies.clear()
    assert location(callback(client, "anything")) == "/sign-in?error=google_failed"


def test_user_cancelling_at_google(client, google_on):
    response = client.get(f"{GOOGLE}/callback", params={"error": "access_denied"}, follow_redirects=False)
    assert location(response) == "/sign-in?error=google_cancelled"


def test_unsafe_next_falls_back_to_dashboard(client, registered, google_on):
    google_on["id_token"] = make_id_token(email=registered["email"])
    response = callback(client, start(client, "//evil.example/steal")["state"][0])
    assert location(response) == "/dashboard"


def test_email_linked_to_another_google_account(client, registered, google_on, db):
    user = db.scalar(select(User).where(User.email == registered["email"]))
    user.google_sub = "someone-else"
    db.commit()
    google_on["id_token"] = make_id_token(email=registered["email"])
    response = callback(client, start(client)["state"][0])
    assert location(response) == "/sign-in?error=google_conflict"


def test_disabled_account_is_refused(client, registered, google_on, db):
    user = db.scalar(select(User).where(User.email == registered["email"]))
    user.is_active = False
    db.commit()
    google_on["id_token"] = make_id_token(email=registered["email"])
    response = callback(client, start(client)["state"][0])
    assert location(response) == "/sign-in?error=google_disabled"
