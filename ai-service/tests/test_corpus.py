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


def test_load_keeps_only_metadata_and_reads_text_on_demand(tmp_path):
    report = {"doc_id": "7", "meta": {"title": "On disk"}, "abstract": "Full text."}
    (tmp_path / "7.json").write_text(json.dumps(report), encoding="utf-8")
    corpus = Corpus.load(tmp_path)
    assert corpus.documents == {}  # nothing but metadata held in memory
    assert corpus.meta("7")["title"] == "On disk"
    assert corpus.get("7")["abstract"] == "Full text."
    assert corpus.get("missing") is None
    assert [d["doc_id"] for d in corpus] == [d["doc_id"] for d in corpus] == ["7"]  # re-iterable
    assert Corpus.load(tmp_path, in_memory=True).documents["7"] == report

