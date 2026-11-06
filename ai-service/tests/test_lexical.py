from app.similarity.lexical import ShingleMatcher, containment, shingles, words

COPIED = "The dataset contains annotated surgical video frames collected from three teaching hospitals."
SOURCE = (
    "We describe our data first. "
    f"{COPIED} "
    "Each frame was labelled by two experienced surgeons working independently of each other."
)


def test_words_lowercase_and_keep_bangla():
    assert words("Hello, World! বাংলা ভাষা") == ["hello", "world", "বাংলা", "ভাষা"]


def test_shingles_are_word_runs():
    assert shingles("a b c d e f", n=5) == {("a", "b", "c", "d", "e"), ("b", "c", "d", "e", "f")}
    assert shingles("too short", n=5) == set()


def test_containment():
    assert containment({1, 2, 3, 4}, {3, 4, 5}) == 0.5
    assert containment(set(), {1}) == 0.0


def test_finds_a_copied_sentence():
    [match] = ShingleMatcher(SOURCE).matches(f"Our study is different. {COPIED}")
    assert match.source == COPIED
    assert match.overlap == 1.0


def test_finds_a_lightly_edited_sentence():
    edited = "The dataset contains annotated surgical video frames collected from four teaching hospitals."
    match = ShingleMatcher(SOURCE).best_match(edited)
    assert match is not None and match.source == COPIED
    assert 0.5 <= match.overlap < 1.0


def test_ignores_unrelated_and_short_sentences():
    matcher = ShingleMatcher(SOURCE)
    assert matcher.best_match("Rice crop disease classification from leaf images using transfer learning.") is None
    assert matcher.best_match("We describe our data first.") is None  # under the minimum length


def test_matches_report_the_source_section():
    matcher = ShingleMatcher([("Introduction", "Nothing to see here at all, honestly."), ("Dataset", COPIED)])
    match = matcher.best_match(COPIED)
    assert match is not None and match.source_section == "Dataset"
