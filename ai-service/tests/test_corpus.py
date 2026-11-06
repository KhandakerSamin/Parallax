import json

from app.services.corpus import Corpus


def test_loads_reports_and_skips_underscore_files(tmp_path):
    (tmp_path / "1.json").write_text(json.dumps({"doc_id": "1", "meta": {}}), encoding="utf-8")
    (tmp_path / "_boilerplate.json").write_text("{}", encoding="utf-8")
    corpus = Corpus.load(tmp_path)
    assert len(corpus) == 1 and "1" in corpus


def test_meta_normalises_dspace_fields():
    corpus = Corpus(
        {
            "a": {"doc_id": "a", "meta": {"title": "T", "supervisor": [], "date_issued": "2025-03-01"}},
            "b": {"doc_id": "b", "meta": {"supervisor": ["Dr. X", "Dr. Y"]}},
        }
    )
    assert corpus.meta("a")["supervisor"] is None
    assert corpus.meta("a")["year"] == "2025"
    assert corpus.meta("b")["supervisor"] == "Dr. X, Dr. Y"
    assert corpus.meta("b")["title"] == "Report b"
