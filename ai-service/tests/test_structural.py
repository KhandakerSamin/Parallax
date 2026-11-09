from app.similarity.structural import StructureModel, heading_words, outline

TEMPLATE = ["Introduction", "Background Study", "Methodology", "Results", "Conclusion"]


def report(doc_id, headings):
    return {"doc_id": doc_id, "sections": [{"title": h, "text": "..."} for h in headings]}


def corpus(extra=()):
    others = [report(f"t{i}", TEMPLATE) for i in range(8)]
    skeleton = report("src", ["Introduction", "Program Schedule and Duration", "Service Portfolio",
                              "Vulnerability Assessment Workflow", "Learning Curve for Advanced Operations",
                              "Conclusion"])  # fmt: skip
    return StructureModel([skeleton, *others, *extra])


def test_heading_words_ignore_numbering_and_stopwords():
    assert heading_words("1.2 Objectives and Purpose") == {"objectives", "purpose"}
    assert heading_words("CHAPTER 3 METHODOLOGY") == {"methodology"}


def test_outline_skips_empty_headings():
    assert outline(report("x", ["Introduction", "", "1.1"])) == ["introduction"]


def test_copied_skeleton_scores_high():
    model = corpus()
    copy = report("new", ["1 Introduction", "1.1 Program Schedule & Duration", "1.2 Service Portfolio",
                          "2 Vulnerability Assessment Workflow", "2.1 Learning Curve for Advanced Operations",
                          "3 Conclusion"])  # fmt: skip
    match = model.compare(copy, "src")
    assert match.score > 0.8
    assert match.aligned[0].source in {
        "Program Schedule and Duration",
        "Service Portfolio",
        "Vulnerability Assessment Workflow",
        "Learning Curve for Advanced Operations",
    }


def test_the_shared_template_alone_scores_low():
    model = corpus()
    own = report("new", ["Introduction", "Smart Irrigation Sensors", "Field Trial Results", "Conclusion"])
    assert model.compare(own, "src").score < 0.15


def test_reordered_headings_score_lower_than_the_same_order():
    model = corpus()
    same = ["Program Schedule and Duration", "Service Portfolio", "Vulnerability Assessment Workflow"]
    in_order = model.compare(report("a", same), "src").score
    reordered = model.compare(report("b", list(reversed(same))), "src").score
    assert reordered < in_order


def test_missing_outline_scores_zero():
    model = corpus()
    assert model.compare({"doc_id": "pasted", "sections": []}, "src").score == 0.0
