import json

import numpy as np
import pytest

from app.embeddings.encoder import HashingEncoder
from app.embeddings.index import PassageIndex
from app.embeddings.passages import Passage, make_passages

SENTENCE = "The proposed system detects student faces in classroom video using a lightweight network."


def document(doc_id="d1", sections=None, abstract=""):
    return {"doc_id": doc_id, "abstract": abstract, "sections": sections or []}


def section(text, title="Methodology", kind="methodology", chapter_kind="methodology"):
    return {"title": title, "kind": kind, "chapter_kind": chapter_kind, "text": text}


# ── encoder ────────────────────────────────────────────────


def test_hashing_encoder_returns_unit_vectors():
    vectors = HashingEncoder(64).encode(["one two three", "four five six seven"])
    assert vectors.shape == (2, 64)
    assert vectors.dtype == np.float32
    assert np.allclose(np.linalg.norm(vectors, axis=1), 1.0)


def test_hashing_encoder_is_deterministic():
    encoder = HashingEncoder()
    assert np.array_equal(encoder.encode([SENTENCE]), HashingEncoder().encode([SENTENCE]))


def test_hashing_encoder_ranks_shared_wording_higher():
    a, b, c = HashingEncoder().encode(
        [SENTENCE, "Our system detects student faces in classroom video.", "Rice prices rose sharply in Dhaka."]
    )
    assert a @ b > a @ c


def test_hashing_encoder_handles_empty_text():
    assert np.allclose(HashingEncoder(32).encode([""]), 0.0)


# ── passages ───────────────────────────────────────────────


def test_passages_respect_target_size_and_keep_sentences_whole():
    text = " ".join(f"Sentence number {i} explains one more step of the method in detail." for i in range(40))
    passages = make_passages(document(sections=[section(text)]), target_words=60)
    assert len(passages) > 3
    assert all(p.text.endswith(".") for p in passages)
    assert all(40 <= len(p.text.split()) <= 90 for p in passages)
    assert [p.index for p in passages] == list(range(len(passages)))


def test_passages_include_abstract_and_skip_appendix_and_references():
    long = " ".join([SENTENCE] * 4)
    doc = document(
        abstract=long,
        sections=[
            section(long),
            section(long, title="Appendix A", kind="appendix", chapter_kind="appendix"),
            section(long, title="References", kind="references", chapter_kind="references"),
        ],
    )
    kinds = [p.kind for p in make_passages(doc)]
    assert kinds == ["abstract", "methodology"]


def test_passages_never_cross_sections():
    doc = document(sections=[section(SENTENCE * 2, title="Intro"), section(SENTENCE * 2, title="Method")])
    assert [p.section for p in make_passages(doc)] == ["Intro", "Method"]


def test_short_tail_is_folded_into_the_previous_passage():
    text = " ".join(["word"] * 70) + ". Short closing remark here."  # 70 fills a window, the tail does not
    [passage] = make_passages(document(sections=[section(text)]))
    assert passage.text.endswith("Short closing remark here.")


def test_tiny_sections_are_dropped():
    assert make_passages(document(sections=[section("Too short.")])) == []


# ── index ──────────────────────────────────────────────────


@pytest.fixture
def index():
    encoder = HashingEncoder()
    texts = {
        "a": "Face detection in classroom video with a lightweight convolutional network.",
        "b": "A mobile app that tracks blood donors and nearby hospitals in Dhaka.",
        "c": "Rice crop disease classification from leaf images using transfer learning.",
    }
    passages = [Passage(doc_id, 0, "Abstract", "abstract", text) for doc_id, text in texts.items()]
    built = PassageIndex(encoder.dim, encoder.name)
    built.add(passages, encoder.encode([p.text for p in passages]))
    return built, encoder


def test_search_returns_the_closest_passage_first(index):
    built, encoder = index
    [hits] = built.search(encoder.encode(["Detecting faces in classroom video."]), k=2)
    assert hits[0].passage.doc_id == "a"
    assert hits[0].score > hits[1].score


def test_search_can_exclude_the_query_document(index):
    built, encoder = index
    [hits] = built.search(encoder.encode(["Detecting faces in classroom video."]), k=3, exclude_doc="a")
    assert "a" not in {h.passage.doc_id for h in hits}
    assert len(hits) == 2


def test_index_round_trips_through_disk(index, tmp_path):
    built, encoder = index
    built.save(tmp_path)
    loaded = PassageIndex.load(tmp_path)
    assert len(loaded) == 3 and loaded.doc_ids == {"a", "b", "c"}
    assert loaded.encoder_name == encoder.name
    query = encoder.encode(["blood donors in Dhaka"])
    assert loaded.search(query, k=1)[0][0].passage.doc_id == "b"


def test_add_rejects_mismatched_lengths():
    built = PassageIndex(8, "test")
    with pytest.raises(ValueError):
        built.add([Passage("a", 0, "", "other", "text")], np.zeros((2, 8), dtype=np.float32))


def test_stored_returns_a_reports_passages_and_vectors(index):
    built, encoder = index
    passages, vectors = built.stored("b")
    assert [p.doc_id for p in passages] == ["b"]
    assert np.allclose(vectors, encoder.encode([passages[0].text]), atol=1e-3)  # stored as float16
    assert built.stored("missing") is None


def test_float32_index_converts_to_float16_with_the_same_results(tmp_path):
    encoder = HashingEncoder()
    texts = ["Face detection in classroom video.", "Blood donors near hospitals.", "Rice leaf disease images."]
    passages = [Passage(str(i), 0, "Abstract", "abstract", t) for i, t in enumerate(texts)]
    built = PassageIndex(encoder.dim, encoder.name, precision="float32")
    built.add(passages, encoder.encode(texts))
    query = encoder.encode(["blood donors"])
    before = built.search(query, k=3)[0]
    built.convert("float16")
    after = built.search(query, k=3)[0]
    assert built.precision == "float16"
    assert [h.passage.doc_id for h in after] == [h.passage.doc_id for h in before]
    assert all(abs(a.score - b.score) < 1e-3 for a, b in zip(after, before, strict=True))
    built.save(tmp_path)
    assert PassageIndex.load(tmp_path).precision == "float16"


def test_an_index_saved_before_precision_existed_loads_as_float32(index, tmp_path):
    built, _ = index
    built.convert("float32")
    built.save(tmp_path)
    manifest = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
    del manifest["precision"]
    (tmp_path / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    assert PassageIndex.load(tmp_path).precision == "float32"


def test_unknown_precision_is_rejected():
    with pytest.raises(ValueError):
        PassageIndex(8, "test", precision="int4")


def test_drop_removes_a_reports_passages_and_keeps_the_rest_searchable(index):
    built, encoder = index
    assert built.drop({"b"}) == 1
    assert built.doc_ids == {"a", "c"} and built._index.ntotal == 2
    [hits] = built.search(encoder.encode(["rice leaf disease"]), k=2)
    assert hits[0].passage.doc_id == "c"
    passages, _ = built.stored("c")
    assert passages[0].doc_id == "c"
    assert built.drop({"missing"}) == 0
