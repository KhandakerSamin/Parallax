import pytest

from app.embeddings.encoder import HashingEncoder
from app.embeddings.index import PassageIndex
from app.embeddings.passages import make_passages
from app.pipelines.analyze import Analyzer, AnalyzerConfig
from app.services.corpus import Corpus

SURGERY = (
    "The dataset contains annotated surgical video frames collected from three teaching hospitals in Dhaka. "
    "Each frame was labelled with the instrument in use and the current phase of the operation. "
    "We trained a convolutional network to recognise the surgical phase from short video clips. "
    "The model reached high accuracy on held-out operations recorded at a different hospital. "
)
FARMING = (
    "Farmers photographed rice leaves in the field with ordinary mobile phones during the monsoon. "
    "The images show blast, brown spot and bacterial blight at different stages of infection. "
    "A transfer learning model classifies each leaf and suggests a treatment to the farmer. "
    "The app works offline because many villages have weak mobile network coverage. "
)
DONORS = (
    "The application connects blood donors with patients who urgently need a transfusion. "
    "Hospitals post requests and nearby donors with a matching blood group receive a notification. "
    "Donors can see when they are next eligible to give blood again safely. "
    "An administrator verifies hospital accounts before they can post any requests at all. "
)


def report(doc_id, body, title=None):
    return {
        "doc_id": doc_id,
        "abstract": "",
        "language": "en",
        "flags": [],
        "sections": [{"title": "Methodology", "kind": "methodology", "chapter_kind": "methodology", "text": body}],
        "meta": {"title": title or f"Report {doc_id}", "authors": ["A. Student"], "date_issued": "2025-01-10"},
    }


@pytest.fixture
def analyzer():
    corpus = Corpus({d["doc_id"]: d for d in [report("s1", SURGERY), report("f1", FARMING), report("b1", DONORS)]})
    encoder = HashingEncoder()
    index = PassageIndex(encoder.dim, encoder.name)
    for document in corpus.documents.values():
        passages = make_passages(document)
        index.add(passages, encoder.encode([p.text for p in passages]))
    return Analyzer(index, encoder, corpus, AnalyzerConfig(semantic_floor=0.6))


def test_copied_report_is_matched_to_its_source(analyzer):
    result = analyzer.analyze(report("new", SURGERY))
    top = result.matches[0]
    assert top.source.id == "s1"
    assert top.scores.lexical > 0.9
    assert top.overall > 0.9
    assert result.summary.level == "high"
    assert {e.perspective for e in top.evidence} == {"lexical"}
    assert top.evidence[0].submitted.section == "Methodology"
    assert top.evidence[0].source.section == "Methodology"


def test_partly_copied_report_scores_in_between(analyzer):
    own = (
        "Our own work studies traffic congestion at busy intersections across the capital city. "
        "Cameras count vehicles and a scheduler adjusts the signal timing every few minutes. "
        "Road users reported shorter waiting times after the system was installed at four junctions. "
        "The city plans to extend the pilot to twenty more junctions during the next year. "
    )
    result = analyzer.analyze(report("new", own + SURGERY))
    top = result.matches[0]
    assert top.source.id == "s1"
    assert 0.3 < top.scores.lexical < 0.7


def test_unrelated_report_has_no_strong_match(analyzer):
    unrelated = (
        "This thesis surveys the history of Bangla typography from metal type to digital fonts. "
        "Early printers in Serampore cut punches by hand for every conjunct letter they needed. "
        "Unicode encoding finally gave Bangla text a single standard representation on computers. "
        "We interviewed designers about the difficulties of shaping complex conjuncts on screen. "
    )
    result = analyzer.analyze(report("new", unrelated))
    assert result.summary.level == "low"
    assert all(m.scores.lexical == 0 for m in result.matches)


def test_a_corpus_report_is_never_matched_to_itself(analyzer):
    result = analyzer.analyze(analyzer.corpus.get("s1"))
    assert "s1" not in {m.source.id for m in result.matches}


def test_source_metadata_is_attached(analyzer):
    top = analyzer.analyze(report("new", DONORS)).matches[0]
    assert top.source.id == "b1"
    assert top.source.title == "Report b1"
    assert top.source.year == "2025"


def test_empty_report_gives_a_note_not_an_error(analyzer):
    result = analyzer.analyze(report("new", "Too short."))
    assert result.matches == []
    assert result.document.passages == 0
    assert result.notes


def test_encoder_must_match_the_index():
    index = PassageIndex(256, "some-other-model")
    with pytest.raises(ValueError):
        Analyzer(index, HashingEncoder(), Corpus())


def test_corpus_reports_reuse_their_indexed_vectors(analyzer, monkeypatch):
    def fail(*args, **kwargs):
        raise AssertionError("a corpus report should not be re-encoded")

    monkeypatch.setattr(analyzer.encoder, "encode", fail)
    result = analyzer.analyze(analyzer.corpus.get("f1"))
    assert result.document.passages == 1


def _hits(*scores):
    from app.embeddings.index import Hit
    from app.embeddings.passages import Passage

    return [Hit(Passage(f"d{i}", 0, "", "other", "text"), s) for i, s in enumerate(scores)]


def test_template_text_with_a_crowded_background_is_not_a_paraphrase(analyzer):
    hits = _hits(0.88, 0.87, 0.87, 0.86, 0.86, 0.85, 0.85, 0.84)  # every report has this table
    background = analyzer._background_score(hits)
    assert not analyzer._is_close(hits[0], background)


def test_text_that_stands_out_from_its_background_is_a_paraphrase(analyzer):
    hits = _hits(0.80, 0.60, 0.58, 0.55, 0.54, 0.53, 0.52, 0.50)  # one source far above the rest
    background = analyzer._background_score(hits)
    assert analyzer._is_close(hits[0], background)


def test_near_identical_text_always_counts_even_when_several_reports_share_it(analyzer):
    hits = _hits(0.99, 0.99, 0.99, 0.98, 0.98, 0.97, 0.97, 0.97)
    assert analyzer._is_close(hits[0], analyzer._background_score(hits))


def test_background_counts_each_report_once(analyzer):
    from app.embeddings.index import Hit
    from app.embeddings.passages import Passage

    same_report = [Hit(Passage("x", i, "", "other", "t"), 0.9) for i in range(10)]
    assert analyzer._background_score(same_report) == 0.0  # one report is no background at all
