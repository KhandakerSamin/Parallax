"""Related prior work, with the AI service replaced by a fake httpx.post."""

import httpx
import pytest

from app.api.routes import related
from tests.test_analysis import ai, signed_in  # noqa: F401  (fixtures)

URL = "/api/v1/related-work"
IDEA = "A mobile app that helps farmers find rice leaf diseases from a photo and suggests a treatment."
RESULT = {"reports": [{"source": {"id": "f1", "title": "Rice Leaf Doctor"}, "score": 0.6}], "idea_terms": []}


@pytest.fixture(autouse=True)
def fresh_limiter():
    related.limiter.reset()
    yield
    related.limiter.reset()


@pytest.fixture
def found(ai):  # noqa: F811
    ai["response"] = httpx.Response(200, json=RESULT)
    return ai


def test_requires_sign_in(client, found):
    assert client.post(URL, json={"text": IDEA}).status_code == 401
    assert found["calls"] == []


def test_the_idea_is_forwarded_and_nothing_is_saved(signed_in, found):  # noqa: F811
    response = signed_in.post(URL, json={"text": f"  {IDEA}  ", "limit": 5})
    assert response.status_code == 200
    assert response.json() == RESULT
    url, kwargs = found["calls"][0]
    assert url == "http://localhost:8001/related"
    assert kwargs["json"] == {"text": IDEA, "limit": 5}
    assert signed_in.get("/api/v1/reports").json()["reports"] == []


def test_a_too_short_idea_is_rejected_before_the_ai_service(signed_in, found):  # noqa: F811
    response = signed_in.post(URL, json={"text": "A website."})
    assert response.status_code == 422
    assert "at least 8 words" in response.json()["message"]
    assert found["calls"] == []


def test_searches_are_limited_per_person(signed_in, found):  # noqa: F811
    for _ in range(related.limiter.max_attempts):
        assert signed_in.post(URL, json={"text": IDEA}).status_code == 200
    response = signed_in.post(URL, json={"text": IDEA})
    assert response.status_code == 429
    assert "Try again in" in response.json()["message"]


def test_an_unavailable_ai_service_answers_503(signed_in, found):  # noqa: F811
    found["response"] = httpx.ConnectError("down")
    assert signed_in.post(URL, json={"text": IDEA}).status_code == 503
