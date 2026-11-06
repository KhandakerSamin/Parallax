from app.extraction.boilerplate import find_boilerplate, sentence_key, strip_boilerplate

TEMPLATE = "This project report has been submitted in fulfilment of the requirements for the degree."


def corpus(n_with_template: int, n_total: int) -> list[str]:
    docs = []
    for i in range(n_total):
        own = f"Report {i} studies topic number {i} with its own original wording and method."
        docs.append(f"{TEMPLATE} {own}" if i < n_with_template else own)
    return docs


def test_sentence_key_ignores_case_and_punctuation():
    assert sentence_key("Hello,   World!") == sentence_key("hello world")


def test_finds_sentences_shared_by_many_reports():
    found = find_boilerplate(corpus(n_with_template=5, n_total=20))
    assert sentence_key(TEMPLATE) in found
    assert found[sentence_key(TEMPLATE)] == 5
    assert len(found) == 1  # each report's own sentence appears once


def test_ignores_sentences_shared_by_too_few_reports():
    assert find_boilerplate(corpus(n_with_template=2, n_total=20)) == {}


def test_threshold_scales_with_corpus_size():
    # 5 of 100 is below 8%, so not boilerplate in a large corpus.
    assert find_boilerplate(corpus(n_with_template=5, n_total=100)) == {}


def test_strip_removes_only_boilerplate():
    text = f"{TEMPLATE} We built a face recognition system for classrooms."
    cleaned = strip_boilerplate(text, {sentence_key(TEMPLATE)})
    assert cleaned == "We built a face recognition system for classrooms."


def test_strip_with_no_boilerplate_is_identity():
    assert strip_boilerplate("Anything at all.", set()) == "Anything at all."
