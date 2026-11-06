import pymupdf
import pytest
from fastapi.testclient import TestClient

from app.api import routes
from app.embeddings.encoder import HashingEncoder
from app.embeddings.index import PassageIndex
from app.embeddings.passages import make_passages
from app.main import app
from app.pipelines.analyze import Analyzer, AnalyzerConfig
from app.services.corpus import Corpus
from app.services.engine import Engine, IndexNotReadyError
from tests.test_analyze import DONORS, FARMING, SURGERY, report


@pytest.fixture
def engine():
    corpus = Corpus({d["doc_id"]: d for d in [report("s1", SURGERY), report("f1", FARMING), report("b1", DONORS)]})
    encoder = HashingEncoder()
    index = PassageIndex(encoder.dim, encoder.name)
    for document in corpus.documents.values():
        passages = make_passages(document)
        index.add(passages, encoder.encode([p.text for p in passages]))
    return Engine(Analyzer(index, encoder, corpus, AnalyzerConfig(semantic_floor=0.6)), set())


@pytest.fixture
def client(engine, monkeypatch):
    monkeypatch.setattr(routes, "get_engine", lambda: engine)
    return TestClient(app)


@pytest.fixture
def no_index(monkeypatch):
    def missing():
        raise IndexNotReadyError("No index")

    monkeypatch.setattr(routes, "get_engine", missing)
    return TestClient(app)


def pdf_bytes(text: str) -> bytes:
    document = pymupdf.open()
    page = document.new_page()
    page.insert_textbox(pymupdf.Rect(50, 50, 550, 800), text, fontsize=11)
    return document.tobytes()


def test_health_reports_the_corpus(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["corpus"] == {"documents": 3, "passages": 3, "encoder": "hashing-256"}


def test_health_is_degraded_without_an_index(no_index):
    assert no_index.get("/health").json()["status"] == "degraded"


def test_analyze_needs_an_index(no_index):
    response = no_index.post("/analyze/text", json={"text": SURGERY})
    assert response.status_code == 503


def test_analyze_text_finds_the_source(client):
    response = client.post("/analyze/text", json={"text": SURGERY, "title": "My report"})
    assert response.status_code == 200
    body = response.json()
    assert body["document"]["title"] == "My report"
    assert body["matches"][0]["source"]["id"] == "s1"
    assert body["matches"][0]["evidence"][0]["perspective"] == "lexical"


def test_analyze_text_rejects_empty_text(client):
    assert client.post("/analyze/text", json={"text": ""}).status_code == 422


def test_analyze_pdf_finds_the_source(client):
    files = {"file": ("copied-report.pdf", pdf_bytes(FARMING), "application/pdf")}
    response = client.post("/analyze", files=files)
    assert response.status_code == 200
    body = response.json()
    assert body["document"]["title"] == "copied-report"
    assert body["matches"][0]["source"]["id"] == "f1"


def test_analyze_rejects_non_pdf(client):
    files = {"file": ("notes.txt", b"just some text", "text/plain")}
    assert client.post("/analyze", files=files).status_code == 415


def test_analyze_rejects_a_damaged_pdf(client):
    files = {"file": ("broken.pdf", b"%PDF-1.7 this is not really a pdf", "application/pdf")}
    assert client.post("/analyze", files=files).status_code == 422


def test_analyze_rejects_oversized_uploads(client):
    big = b"%PDF" + b"0" * (routes.settings.max_upload_mb * 1024 * 1024)
    files = {"file": ("big.pdf", big, "application/pdf")}
    assert client.post("/analyze", files=files).status_code == 413
