from datetime import timedelta

import pytest
from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser
from app.core.security import hash_token
from app.models import AuthSession, User
from tests.conftest import STRONG_PASSWORD

AUTH = "/api/v1/auth"
COOKIE = "parallax_session"


def login(client, identifier, password=STRONG_PASSWORD, remember=False):
    return client.post(f"{AUTH}/login", json={"identifier": identifier, "password": password, "remember": remember})


# ----- register -------------------------------------------------------------


def test_register_creates_user_and_signs_in(client, new_user):
    response = client.post(f"{AUTH}/register", json=new_user)

    assert response.status_code == 201
    user = response.json()["user"]
    assert user["email"] == "nusrat@diu.edu.bd"
    assert user["universityId"] == "221-35-123"
    assert user["role"] == "student"
    assert set(user) == {
        "id",
        "name",
        "email",
        "universityId",
        "role",
        "department",
        "avatarUrl",
        "googleLinked",
    }

    set_cookie = response.headers["set-cookie"]
    assert f"{COOKIE}=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "samesite=lax" in set_cookie.lower()
    assert "Max-Age" not in set_cookie  # browser-session cookie without remember-me

    assert client.get(f"{AUTH}/me").json()["user"]["id"] == user["id"]


def test_password_is_hashed_not_stored(client, new_user, db):
    client.post(f"{AUTH}/register", json=new_user)
    stored = db.scalar(select(User).where(User.email == new_user["email"]))
    assert stored.password_hash != STRONG_PASSWORD
    assert stored.password_hash.startswith("$argon2id$")


def test_register_normalises_email_and_id(client, new_user):
    body = {**new_user, "email": "Nusrat@DIU.edu.bd", "universityId": "staff-01"}
    response = client.post(f"{AUTH}/register", json=body)
    assert response.status_code == 201
    assert response.json()["user"]["email"] == "nusrat@diu.edu.bd"
    assert response.json()["user"]["universityId"] == "STAFF-01"


def test_register_rejects_duplicate_email(client, registered):
    body = {**registered, "email": "NUSRAT@diu.edu.bd", "universityId": "999-99-999"}
    response = client.post(f"{AUTH}/register", json=body)
    assert response.status_code == 409
    assert response.json() == {"message": "An account with this email already exists.", "field": "email"}


def test_register_rejects_duplicate_university_id(client, registered):
    body = {**registered, "email": "other@diu.edu.bd"}
    response = client.post(f"{AUTH}/register", json=body)
    assert response.status_code == 409
    assert response.json()["field"] == "universityId"


@pytest.mark.parametrize(
    ("changes", "field"),
    [
        ({"email": "someone@gmail.com"}, "email"),
        ({"email": "not-an-email"}, "email"),
        ({"password": "password"}, "password"),
        ({"role": "admin"}, "role"),
        ({"department": "Astrology"}, "department"),
        ({"universityId": "a b"}, "universityId"),
        ({"name": "A"}, "name"),
    ],
)
def test_register_validates_input(client, new_user, changes, field):
    response = client.post(f"{AUTH}/register", json={**new_user, **changes})
    assert response.status_code == 400
    assert response.json()["field"] == field
    assert response.json()["message"]


def test_register_requires_fields(client):
    response = client.post(f"{AUTH}/register", json={})
    assert response.status_code == 400
    assert response.json()["message"]


def test_register_accepts_university_subdomain(client, new_user):
    response = client.post(f"{AUTH}/register", json={**new_user, "email": "nusrat@swe.diu.edu.bd"})
    assert response.status_code == 201


# ----- login ----------------------------------------------------------------


@pytest.mark.parametrize("identifier", ["nusrat@diu.edu.bd", "NUSRAT@diu.edu.bd", "221-35-123"])
def test_login_with_email_or_id(client, registered, identifier):
    response = login(client, identifier)
    assert response.status_code == 200
    assert response.json()["user"]["email"] == registered["email"]
    assert client.get(f"{AUTH}/me").json()["user"] is not None


def test_login_remember_me_sets_persistent_cookie(client, registered):
    response = login(client, registered["email"], remember=True)
    assert "Max-Age=2592000" in response.headers["set-cookie"]


def test_wrong_password_and_unknown_user_look_the_same(client, registered):
    wrong = login(client, registered["email"], password="Wrong#Pass1")
    unknown = login(client, "ghost@diu.edu.bd")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"message": "Incorrect email/ID or password."}
    assert "set-cookie" not in wrong.headers


def test_login_locks_after_repeated_failures(client, registered):
    for _ in range(5):
        assert login(client, registered["email"], password="Wrong#Pass1").status_code == 401

    blocked = login(client, registered["email"])  # even the right password is refused while locked
    assert blocked.status_code == 429
    assert int(blocked.headers["retry-after"]) > 0
    assert "Too many sign-in attempts" in blocked.json()["message"]


def test_successful_login_resets_failure_count(client, registered):
    for _ in range(4):
        login(client, registered["email"], password="Wrong#Pass1")
    assert login(client, registered["email"]).status_code == 200
    assert login(client, registered["email"], password="Wrong#Pass1").status_code == 401


def test_disabled_user_cannot_sign_in(client, registered, db):
    user = db.scalar(select(User).where(User.email == registered["email"]))
    user.is_active = False
    db.commit()
    assert login(client, registered["email"]).status_code == 401


# ----- me / logout / sessions -----------------------------------------------


def test_me_when_signed_out(client):
    response = client.get(f"{AUTH}/me")
    assert response.status_code == 200
    assert response.json() == {"user": None}
    assert response.headers["cache-control"] == "no-store"


def test_me_clears_unknown_cookie(client):
    client.cookies.set(COOKIE, "forged-token")
    response = client.get(f"{AUTH}/me")
    assert response.json() == {"user": None}
    assert f'{COOKIE}=""' in response.headers["set-cookie"]


def test_logout_revokes_session_server_side(client, registered, db):
    login(client, registered["email"])
    token = client.cookies.get(COOKIE)

    assert client.post(f"{AUTH}/logout").status_code == 204
    assert db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(token))) is None

    client.cookies.set(COOKIE, token)  # replaying the old cookie must not work
    assert client.get(f"{AUTH}/me").json() == {"user": None}


def test_logout_when_signed_out_is_ok(client):
    assert client.post(f"{AUTH}/logout").status_code == 204


def test_expired_session_is_rejected(client, registered, db):
    login(client, registered["email"])
    token_hash = hash_token(client.cookies.get(COOKIE))
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash))
    session.expires_at = session.expires_at - timedelta(days=2)
    db.commit()

    assert client.get(f"{AUTH}/me").json() == {"user": None}
    db.expire_all()
    assert db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash)) is None


def test_only_token_hash_is_stored(client, registered, db):
    login(client, registered["email"])
    token = client.cookies.get(COOKIE)
    stored = db.scalars(select(AuthSession.token_hash)).all()
    assert hash_token(token) in stored
    assert token not in stored


def test_current_user_dependency_protects_routes(client, registered):
    from app.main import app

    router = APIRouter()

    @router.get("/api/v1/_test/whoami")
    def whoami(user: CurrentUser) -> dict:
        return {"email": user.email}

    app.include_router(router)
    try:
        assert client.get("/api/v1/_test/whoami").status_code == 401
        login(client, registered["email"])
        assert client.get("/api/v1/_test/whoami").json() == {"email": registered["email"]}
    finally:
        app.router.routes[:] = [r for r in app.router.routes if getattr(r, "path", "") != "/api/v1/_test/whoami"]
