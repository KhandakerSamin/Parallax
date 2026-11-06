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
