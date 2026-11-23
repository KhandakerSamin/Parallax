"""Related prior work: the earlier reports closest to a project idea.

A student describes an idea in a few sentences, before writing anything. The idea
is embedded with the same encoder as the corpus, the nearest passages are found,
and each report is ranked by its closest passage. The concept model adds the key
terms the idea shares with each report and the ones only the idea has, so the
student sees both the overlap and what could make their project different.

This is discovery, not a similarity check: nothing is scored as reuse or saved.
"""

from __future__ import annotations

import re

from pydantic import BaseModel, Field

from app.embeddings.encoder import Encoder
from app.embeddings.index import Hit, PassageIndex
from app.models.analysis import SourceInfo
from app.services.corpus import Corpus
from app.similarity.concept import ConceptModel, terms

WINDOW_WORDS = 120  # about one corpus passage
MAX_WINDOWS = 8
HITS_PER_WINDOW = 200
EXCERPT_CHARS = 420
POOL = 60  # reports re-ranked with the concept model
CONCEPT_WEIGHT = 0.4

# Bands for the ranking score, set by reading results for sample ideas on the DIU corpus:
# a few-sentence idea rarely passes 0.66 even against a project on the same topic, and a
# one-line idea like "A website." stays under 0.46.
CLOSE, CLOSE_WITH_TERMS, RELATED = 0.62, 0.54, 0.51


class RelatedReport(BaseModel):
    source: SourceInfo
    score: float = Field(
        ..., ge=0.0, le=1.0, description="Ranking score: closeness in meaning plus a share for common key terms."
    )
    closeness: str = Field(..., description="close, related or distant")
    section: str = ""
    excerpt: str
    shared_terms: list[str] = []


class RelatedResult(BaseModel):
    reports: list[RelatedReport]
    idea_terms: list[str] = Field([], description="The idea's key terms that none of the shown reports share.")
    corpus: dict


def _windows(text: str) -> list[str]:
    words = text.split()
    if len(words) <= WINDOW_WORDS:
        return [text]
    step = WINDOW_WORDS // 2
    starts = range(0, len(words) - step, step)
    return [" ".join(words[i : i + WINDOW_WORDS]) for i in starts][:MAX_WINDOWS]


def _excerpt(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= EXCERPT_CHARS:
        return text
    cut = text[:EXCERPT_CHARS].rsplit(" ", 1)[0]
    return cut.rstrip(",.;:") + "…"


def closeness(score: float, shared_terms: int = 0) -> str:
    if score >= CLOSE or (score >= CLOSE_WITH_TERMS and shared_terms >= 2):
        return "close"
    if score >= RELATED:
        return "related"
    return "distant"


def find_related(
    text: str,
    *,
    index: PassageIndex,
    encoder: Encoder,
    corpus: Corpus,
    concepts: ConceptModel,
    limit: int = 10,
) -> RelatedResult:
    hits_by_doc: dict[str, list[Hit]] = {}
    for hits in index.search(encoder.encode(_windows(text)), k=HITS_PER_WINDOW):
        for hit in hits:
            hits_by_doc.setdefault(hit.passage.doc_id, []).append(hit)

    # A report that matches in two places is a better lead than one lucky passage.
    def semantic(doc_id: str) -> float:
        top = sorted((h.score for h in hits_by_doc[doc_id]), reverse=True)[:2]
        return sum(top) / len(top)

    pool = sorted(hits_by_doc, key=semantic, reverse=True)[:POOL]
    idea = concepts.profile_from_counts(terms(text))
    scored = []
    for doc_id in pool:
        source_profile = concepts.profiles.get(doc_id)
        match = concepts.compare(idea, source_profile, shared_terms=6) if source_profile else None
        rank = semantic(doc_id) + CONCEPT_WEIGHT * (match.score if match else 0.0)
        scored.append((rank, doc_id, match.shared if match else []))
    scored.sort(reverse=True)

    reports: list[RelatedReport] = []
    seen_titles: set[str] = set()
    for rank, doc_id, shared in scored:
        meta = corpus.meta(doc_id)
        title_key = re.sub(r"\W+", " ", meta["title"].lower()).strip()
        if title_key in seen_titles:
            continue  # the repository sometimes holds one project under two records
        seen_titles.add(title_key)
        best = max(hits_by_doc[doc_id], key=lambda h: h.score)
        reports.append(
            RelatedReport(
                source=SourceInfo(**meta),
                score=round(max(0.0, min(rank, 1.0)), 4),
                closeness=closeness(rank, len(shared)),
                section=best.passage.section,
                excerpt=_excerpt(best.passage.text),
                shared_terms=shared,
            )
        )
        if len(reports) == limit:
            break

    shared_words = {w for r in reports for t in r.shared_terms for w in t.split()}
    own = [t for t in idea.top(30) if " " not in t and t not in shared_words]
    return RelatedResult(
        reports=reports,
        idea_terms=own[:6],
        corpus={"documents": len(index.doc_ids), "passages": len(index)},
    )
