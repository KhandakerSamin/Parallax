"""scripts/delete_user.py: shows first, deletes only with --yes, keeps others' reviews."""

from datetime import timedelta

import pytest
from scripts import delete_user
from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import utcnow
from app.models import AuthSession, Report, Role, User


@pytest.fixture
def people(session_factory, monkeypatch):
    monkeypatch.setattr(delete_user, "SessionLocal", session_factory)
    with session_factory() as db:
        password = hash_password("Parallax#2026")
        tester = User(
            name="Test Account",
            email="test@diu.edu.bd",
            university_id="TEST-7813",
            role=Role.reviewer,
            department="Software Engineering",
            password_hash=password,
        )
        student = User(
            name="Student",
            email="student@diu.edu.bd",
            university_id="221-35-001",
            role=Role.student,
            department="Software Engineering",
            password_hash=password,
        )
        boss = User(
            name="Boss",
            email="boss@diu.edu.bd",
            university_id="STAFF-0001",
            role=Role.super_admin,
            department="Software Engineering",
            password_hash=password,
        )
        db.add_all([tester, student, boss])
        db.flush()
        summary = {
            "user_id": None,
            "title": "t",
            "source_kind": "text",
            "source_name": "t",
            "overall": 0.1,
            "hybrid": 0.1,
            "level": "low",
            "words": 10,
            "match_count": 0,
            "result": {},
        }
        db.add(Report(**{**summary, "user_id": tester.id, "title": "Tester's own"}))
        db.add(
            Report(
                **{
                    **summary,
                    "user_id": student.id,
                    "title": "Reviewed",
                    "review_status": "cleared",
                    "reviewed_by_id": tester.id,
                }
            )
        )
        db.add(AuthSession(user_id=tester.id, token_hash="h", expires_at=utcnow() + timedelta(days=1)))
        db.commit()
    return session_factory


def test_without_yes_nothing_is_deleted(people, capsys):
    assert delete_user.main(["--id", "test-7813"]) == 0
    assert "1 report(s)" in capsys.readouterr().out
    with people() as db:
        assert db.scalar(select(User).where(User.university_id == "TEST-7813")) is not None


def test_yes_deletes_the_account_its_reports_and_sessions(people):
    assert delete_user.main(["--email", "TEST@diu.edu.bd", "--yes"]) == 0
    with people() as db:
        assert db.scalar(select(User).where(User.university_id == "TEST-7813")) is None
        assert db.scalar(select(Report).where(Report.title == "Tester's own")) is None
        assert db.scalars(select(AuthSession)).all() == []
        reviewed = db.scalar(select(Report).where(Report.title == "Reviewed"))
        assert reviewed is not None  # someone else's report stays
        assert reviewed.review_status == "cleared" and reviewed.reviewed_by_id is None


def test_unknown_account_and_last_super_admin_are_refused(people):
    assert delete_user.main(["--id", "NOPE-1", "--yes"]) == 1
    assert delete_user.main(["--email", "boss@diu.edu.bd", "--yes"]) == 1
    with people() as db:
        assert db.scalar(select(User).where(User.email == "boss@diu.edu.bd")) is not None
