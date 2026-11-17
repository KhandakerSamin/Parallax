"""The signed-in user's own account: profile, password and sessions (Settings)."""

from fastapi.testclient import TestClient

from app.main import app as fastapi_app
from app.models import AuthSession, User
from tests.conftest import STRONG_PASSWORD

ME = "/api/v1/auth/me"
NEW_PASSWORD = "Another#Pass2027"


def sign_in(client, identifier: str, password: str = STRONG_PASSWORD) -> None:
    response = client.post("/api/v1/auth/login", json={"identifier": identifier, "password": password})
    assert response.status_code == 200, response.text


def test_account_routes_need_a_session(client):
    assert client.patch(ME, json={"name": "New Name"}).status_code == 401
    assert client.post(f"{ME}/password", json={"currentPassword": "x", "newPassword": NEW_PASSWORD}).status_code == 401
    assert client.get(f"{ME}/sessions").status_code == 401
    assert client.post(f"{ME}/sessions/revoke-others").status_code == 401


def test_update_name_and_department(client, registered):
    sign_in(client, registered["email"])
    response = client.patch(ME, json={"name": "Nusrat J.", "department": "Computer Science and Engineering"})
    assert response.status_code == 200
    user = response.json()["user"]
    assert user["name"] == "Nusrat J."
    assert user["department"] == "Computer Science and Engineering"
    assert client.get(ME).json()["user"]["name"] == "Nusrat J."


def test_profile_cannot_change_role_email_or_id(client, registered):
    sign_in(client, registered["email"])
    response = client.patch(
        ME, json={"name": "Nusrat", "role": "super_admin", "email": "x@diu.edu.bd", "universityId": "999-99-999"}
    )
    assert response.status_code == 200
    user = response.json()["user"]
    assert user["role"] == "student"
    assert user["email"] == registered["email"]
    assert user["universityId"] == registered["universityId"]


def test_profile_validates_like_sign_up(client, registered):
    sign_in(client, registered["email"])
    # Validation errors answer 400 with the field, as sign-up does.
    assert client.patch(ME, json={"name": "N"}).status_code == 400
    response = client.patch(ME, json={"department": "Astrology"})
    assert response.status_code == 400
    assert response.json()["field"] == "department"
    assert client.patch(ME, json={}).status_code == 400


def test_change_password_signs_out_other_sessions(client, registered, session_factory):
    # A second browser signed in to the same account.
    other = TestClient(fastapi_app)
    sign_in(other, registered["email"])
    sign_in(client, registered["email"])

    response = client.post(f"{ME}/password", json={"currentPassword": STRONG_PASSWORD, "newPassword": NEW_PASSWORD})
    assert response.status_code == 200
    # The other browser, plus the session sign-up opened in the fixture.
    assert response.json()["revoked"] == 2

    assert client.get(ME).json()["user"] is not None  # this browser stays signed in
    assert other.get(ME).json()["user"] is None  # the other one is signed out

    client.cookies.clear()
    assert (
        client.post(
            "/api/v1/auth/login", json={"identifier": registered["email"], "password": STRONG_PASSWORD}
        ).status_code
        == 401
    )
    sign_in(client, registered["email"], NEW_PASSWORD)


def test_change_password_checks_the_current_one(client, registered):
    sign_in(client, registered["email"])
    response = client.post(f"{ME}/password", json={"currentPassword": "Wrong#Pass2026", "newPassword": NEW_PASSWORD})
    assert response.status_code == 400
    assert response.json()["field"] == "currentPassword"


def test_change_password_enforces_the_strength_rules(client, registered):
    sign_in(client, registered["email"])
    response = client.post(f"{ME}/password", json={"currentPassword": STRONG_PASSWORD, "newPassword": "weakpass"})
    assert response.status_code == 400
    assert response.json()["field"] == "newPassword"


def test_change_password_is_rate_limited(client, registered):
    sign_in(client, registered["email"])
    for _ in range(5):
        client.post(f"{ME}/password", json={"currentPassword": "Wrong#Pass2026", "newPassword": NEW_PASSWORD})
    response = client.post(f"{ME}/password", json={"currentPassword": STRONG_PASSWORD, "newPassword": NEW_PASSWORD})
    assert response.status_code == 429
    assert "Retry-After" in response.headers


def test_google_only_account_has_no_password_to_change(client, registered, db):
    user = db.query(User).filter_by(email=registered["email"]).one()
    user.password_hash = None
    db.commit()
    # Sign in by creating a session directly (a Google-only account has no password).
    from app.services.auth import issue_session

    issued = issue_session(db, user, remember=False)
    client.cookies.set("parallax_session", issued.token)
    response = client.post(f"{ME}/password", json={"currentPassword": "anything", "newPassword": NEW_PASSWORD})
    assert response.status_code == 400
    assert "Google" in response.json()["message"]


def test_list_sessions_marks_this_browser(client, registered):
    other = TestClient(fastapi_app)
    sign_in(other, registered["email"])
    sign_in(client, registered["email"])
    sessions = client.get(f"{ME}/sessions").json()["sessions"]
    assert len(sessions) == 3  # this browser, the other one, and the one sign-up opened
    assert sum(s["current"] for s in sessions) == 1
    assert "tokenHash" not in sessions[0] and "token_hash" not in sessions[0]


def test_revoke_other_sessions(client, registered, db):
    other = TestClient(fastapi_app)
    sign_in(other, registered["email"])
    sign_in(client, registered["email"])
    response = client.post(f"{ME}/sessions/revoke-others")
    assert response.json()["revoked"] == 2
    assert other.get(ME).json()["user"] is None
    assert client.get(ME).json()["user"] is not None
    assert db.query(AuthSession).count() == 1
