from app.similarity.concept import ConceptModel, terms, tokens


def doc(doc_id, text, title=""):
    return {"doc_id": doc_id, "abstract": "", "meta": {"title": title}, "sections": [{"title": "", "text": text}]}


PEPTIDES = (
    "We predict IL-4 inducing peptides with amino acid composition features. ADASYN balances the peptide classes. "
    "The peptide classifier reports MCC and AUC on an independent peptide test set. Amino acid composition helps."
)
PEPTIDES_REWORDED = (
    "This study classifies IL-4 inducing peptides from amino acid composition. Class imbalance is fixed with ADASYN. "
    "MCC and AUC are reported for every peptide classifier. Amino acid composition remains the strongest feature."
)
RANSOMWARE = (
    "Ransomware encrypts victim files and demands payment. Our ransomware detection model watches file system "
    "behaviour and flags encryption bursts before the ransomware spreads across the network."
)
FILLER = "The system lets the user manage data in the database through a simple web interface for the project."


def corpus():
    return [doc("p1", PEPTIDES), doc("r1", RANSOMWARE), doc("f1", FILLER), doc("f2", FILLER + " Users log in.")]


def test_tokens_drop_stopwords_and_short_fragments():
    assert tokens("The model is used in an IL-4 study of ADASYN") == ["model", "il-4", "study", "adasyn"]


def test_terms_include_two_word_phrases():
    counts = terms("amino acid composition")
    assert counts["amino acid"] == 1
    assert counts["acid composition"] == 1


def test_reworded_report_shares_concepts_with_its_source():
    model = ConceptModel(corpus())
    match = model.compare(model.profile(doc("new", PEPTIDES_REWORDED)), model.profiles["p1"])
    assert match.score > 0.3
    assert any("amino acid" in t or "peptide" in t for t in match.shared)


def test_unrelated_topics_share_no_concepts():
    model = ConceptModel(corpus())
    match = model.compare(model.profile(doc("new", PEPTIDES_REWORDED)), model.profiles["r1"])
    assert match.score < 0.05


def test_identical_text_scores_one():
    model = ConceptModel(corpus())
    match = model.compare(model.profiles["p1"], model.profiles["p1"])
    assert match.score > 0.99


def test_generic_terms_are_dropped_in_a_real_sized_corpus():
    generic = "system user database interface"
    documents = [doc(f"d{i}", f"{generic} topic{i} unique{i} topic{i}") for i in range(20)]
    model = ConceptModel(documents)
    assert "system" not in model.idf  # in every report: carries no concept
    assert "topic3" not in model.idf  # in a single report: no shared concept possible
