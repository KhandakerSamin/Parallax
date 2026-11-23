from fastapi.testclient import TestClient

from app.api import routes
from app.embeddings.encoder import HashingEncoder
from app.embeddings.index import PassageIndex
from app.embeddings.passages import make_passages
from app.main import app
from app.pipelines.analyze import Analyzer
from app.pipelines.related import closeness
from app.services.corpus import Corpus
from app.services.engine import Engine
from tests.test_analyze import DONORS, FARMING, SURGERY, report
from tests.test_api import client, engine  # noqa: F401  (fixtures)

IDEA = (
    "A mobile app for farmers that photographs rice leaves, recognises blast and brown spot, "
    "and suggests a treatment, working offline in villages."
)


def test_the_closest_report_comes_first_with_shared_terms(engine):  # noqa: F811
    result = engine.related(IDEA, 3)
    first = result.reports[0]
    assert first.source.id == "f1"
    assert first.shared_terms  # e.g. "rice", "brown spot"
    assert first.excerpt.startswith("Farmers photographed rice leaves")
    assert first.score > result.reports[-1].score
    assert result.corpus == {"documents": 3, "passages": 3}


def test_idea_terms_leave_out_what_the_reports_share(engine):  # noqa: F811
    result = engine.related(IDEA, 3)
    shared_words = {w for r in result.reports for t in r.shared_terms for w in t.split()}
    assert result.idea_terms
    assert not set(result.idea_terms) & shared_words
    assert all(" " not in term for term in result.idea_terms)


def test_one_project_held_twice_is_shown_once():
    documents = [
        report("f1", FARMING, title="Rice Leaf Doctor"),
        report("f2", FARMING, title="Rice leaf doctor."),
        report("s1", SURGERY),
        report("b1", DONORS),
    ]
    corpus = Corpus({d["doc_id"]: d for d in documents})
    encoder = HashingEncoder()
    index = PassageIndex(encoder.dim, encoder.name)
    for document in documents:
        passages = make_passages(document)
        index.add(passages, encoder.encode([p.text for p in passages]))
    result = Engine(Analyzer(index, encoder, corpus), set()).related(IDEA, 10)
    titles = [r.source.title for r in result.reports]
    assert sum(t.lower().startswith("rice leaf doctor") for t in titles) == 1


def test_closeness_bands():
    assert closeness(0.66) == "close"
    assert closeness(0.56, shared_terms=2) == "close"
    assert closeness(0.56, shared_terms=1) == "related"
    assert closeness(0.40) == "distant"


def test_the_endpoint_returns_reports(client):  # noqa: F811
    response = client.post("/related", json={"text": IDEA, "limit": 2})
    assert response.status_code == 200
    body = response.json()
    assert len(body["reports"]) == 2
    assert body["reports"][0]["source"]["id"] == "f1"
    assert body["reports"][0]["closeness"] in ("close", "related", "distant")


def test_the_endpoint_checks_its_input(client):  # noqa: F811
    assert client.post("/related", json={"text": ""}).status_code == 422
    assert client.post("/related", json={"text": IDEA, "limit": 50}).status_code == 422
    assert client.post("/related", json={"text": "x" * 5_001}).status_code == 422


def test_the_endpoint_needs_a_key_when_one_is_set(engine, monkeypatch):  # noqa: F811
    monkeypatch.setenv("AI_SHARED_SECRET", "a-real-secret")
    monkeypatch.setattr(routes, "get_engine", lambda: engine)
    assert TestClient(app).post("/related", json={"text": IDEA}).status_code == 401
