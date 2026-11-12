"""Each test gets a fresh schema on its own database: a temp SQLite file by default,
or PostgreSQL when TEST_DATABASE_URL is set (as in CI). Never the dev database."""

import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

import app.models  # noqa: F401
from app.api.routes.auth import login_limiter
from app.db.base import Base
from app.db.session import build_engine, get_db
from app.main import app as fastapi_app

STRONG_PASSWORD = "Parallax#2026"


@pytest.fixture(scope="session")
def engine(tmp_path_factory):
    url = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{tmp_path_factory.mktemp('db') / 'test.db'}"
    engine = build_engine(url)
    yield engine
    # Leave the database empty: CI runs the migrations on the same database after the tests.
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def session_factory(engine):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture
def db(session_factory) -> Iterator[Session]:
    with session_factory() as session:
        yield session


@pytest.fixture
def client(session_factory) -> Iterator[TestClient]:
    def _get_db() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    fastapi_app.dependency_overrides[get_db] = _get_db
    login_limiter.reset()
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def new_user() -> dict:
    return {
        "name": "Nusrat Jahan",
        "email": "nusrat@diu.edu.bd",
        "universityId": "221-35-123",
        "role": "student",
        "department": "Software Engineering",
        "password": STRONG_PASSWORD,
    }


@pytest.fixture
def registered(client, new_user) -> dict:
    response = client.post("/api/v1/auth/register", json=new_user)
    assert response.status_code == 201
    client.cookies.clear()
    return new_user
