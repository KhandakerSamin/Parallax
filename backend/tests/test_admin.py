"""Admin endpoints: listing people, changing roles, deactivating, and the safety rules around them."""

import pytest

from app.models import Role, User
from tests.conftest import STRONG_PASSWORD

ADMIN = "/api/v1/admin"


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
    response = client.post("/api/v1/auth/register", json=body)
    assert response.status_code == 201
    return response.json()["user"]["id"]


def sign_in(client, email):
    client.cookies.clear()
    assert (
        client.post(
            "/api/v1/auth/login", json={"identifier": email, "password": STRONG_PASSWORD, "remember": False}
        ).status_code
        == 200
    )


def promote(db, email, role):
    user = db.query(User).filter_by(email=email).one()
    user.role = role
    db.commit()


@pytest.fixture
def people(client, db):
    ids = {
        "student": register(client, "Nusrat Jahan", "nusrat@diu.edu.bd", "221-35-123"),
        "reviewer": register(client, "Dr. Reviewer", "reviewer@diu.edu.bd", "STAFF-0042", role="reviewer"),
        "admin": register(client, "Site Admin", "admin@diu.edu.bd", "STAFF-0001"),
    }
    promote(db, "admin@diu.edu.bd", Role.admin)
    sign_in(client, "admin@diu.edu.bd")
    return ids


def test_admins_list_and_search_people(client, people):
    body = client.get(f"{ADMIN}/users").json()
    assert body["total"] == 3
    assert {u["email"] for u in body["users"]} == {"nusrat@diu.edu.bd", "reviewer@diu.edu.bd", "admin@diu.edu.bd"}
    assert body["users"][0]["reportCount"] == 0

    found = client.get(f"{ADMIN}/users", params={"q": "221-35"}).json()["users"]
    assert [u["name"] for u in found] == ["Nusrat Jahan"]
    reviewers = client.get(f"{ADMIN}/users", params={"role": "reviewer"}).json()["users"]
    assert [u["name"] for u in reviewers] == ["Dr. Reviewer"]


def test_stats_count_people_and_reports(client, people):
    stats = client.get(f"{ADMIN}/stats").json()
    assert stats["users"] == 3
    assert stats["usersByRole"]["admin"] == 1
    assert stats["reports"] == 0
    assert set(stats["reviewsByStatus"]) == {"pending", "cleared", "follow_up"}


def test_an_admin_makes_a_student_a_reviewer(client, people):
    response = client.patch(f"{ADMIN}/users/{people['student']}", json={"role": "reviewer"})
    assert response.status_code == 200
    assert response.json()["role"] == "reviewer"


def test_a_deactivated_account_is_signed_out_and_cannot_sign_in(client, people):
    assert client.patch(f"{ADMIN}/users/{people['student']}", json={"isActive": False}).json()["isActive"] is False
    client.cookies.clear()
    response = client.post(
        "/api/v1/auth/login", json={"identifier": "nusrat@diu.edu.bd", "password": STRONG_PASSWORD, "remember": False}
    )
    assert response.status_code in (401, 403)


def test_admins_cannot_change_themselves(client, people):
    response = client.patch(f"{ADMIN}/users/{people['admin']}", json={"role": "student"})
    assert response.status_code == 400


def test_only_a_super_admin_grants_admin_rights(client, people, db):
    assert client.patch(f"{ADMIN}/users/{people['reviewer']}", json={"role": "admin"}).status_code == 403
    promote(db, "admin@diu.edu.bd", Role.super_admin)
    assert client.patch(f"{ADMIN}/users/{people['reviewer']}", json={"role": "admin"}).json()["role"] == "admin"


def test_non_admins_are_refused(client, people):
    sign_in(client, "reviewer@diu.edu.bd")
    assert client.get(f"{ADMIN}/users").status_code == 403
    assert client.get(f"{ADMIN}/stats").status_code == 403
    assert client.patch(f"{ADMIN}/users/{people['student']}", json={"role": "admin"}).status_code == 403


def test_unknown_user(client, people):
    assert client.patch(f"{ADMIN}/users/nobody", json={"role": "reviewer"}).status_code == 404
