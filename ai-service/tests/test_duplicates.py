from app.extraction.duplicates import find_duplicates


def report(doc_id, text, authors=("Rahman, A",)):
    return {"doc_id": doc_id, "abstract": "", "sections": [{"text": text}], "meta": {"authors": list(authors)}}


BODY = " ".join(f"word{i}" for i in range(1500))
OTHER = " ".join(f"other{i}" for i in range(1500))


def test_identical_text_keeps_the_lowest_id():
    copies = find_duplicates([report("13066", BODY), report("12375", BODY), report("5", OTHER)])
    assert copies == {"13066": "12375"}


def test_a_revised_reupload_by_the_same_author_is_a_copy():
    revised = BODY + " plus a corrected conclusion"
    assert find_duplicates([report("2922", BODY), report("2974", revised)]) == {"2974": "2922"}


def test_a_shared_opening_by_different_authors_is_never_hidden():
    revised = BODY + " plus a different conclusion"
    assert find_duplicates([report("1", BODY), report("2", revised, authors=("Someone, Else",))]) == {}


def test_chains_of_copies_point_at_one_kept_report():
    copies = find_duplicates([report("30", BODY), report("10", BODY), report("20", BODY)])
    assert copies == {"20": "10", "30": "10"}


def test_reports_with_little_text_are_ignored():
    assert find_duplicates([report("1", "too short"), report("2", "too short")]) == {}
