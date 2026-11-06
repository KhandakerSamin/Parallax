"""Compare one report against the corpus: find candidate sources, score them, collect evidence.

1. Split the report into passages and embed them.
2. Look up each passage's nearest corpus passages in the FAISS index. Any report
   that comes up becomes a candidate source.
3. Semantic score: the share of the report's words that sit in passages with a
   close paraphrase in that source. A passage pair is a close paraphrase when it is
   near-identical, or when it is similar *and* stands out from the passage's background:
   the similarity of the 4th-8th best other reports. Every SWE report has use-case tables
   and metric definitions that look alike; those have a crowded background and never
   stand out, while reworded or translated text has one source far above the rest.
4. Lexical score: the share of the report's words that sit in sentences reusing
   the source's wording (word-shingle overlap), computed for the strongest candidates.
5. Keep sources whose evidence clears the bar, best first, with the passages side by side.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from app.embeddings.encoder import Encoder
from app.embeddings.index import Hit, PassageIndex
from app.embeddings.passages import Passage, comparable_parts, make_passages
from app.models.analysis import (
    AnalysisResult,
    AnalysisSummary,
    DocumentInfo,
    Evidence,
    Excerpt,
    Match,
    PerspectiveScores,
    SourceInfo,
)
from app.services.corpus import Corpus
from app.similarity.lexical import SentenceMatch, ShingleMatcher, words


@dataclass(frozen=True)
class AnalyzerConfig:
    neighbours: int = 60  # nearest corpus passages fetched per submitted passage
    # Close-paraphrase rule (calibrated on the SWE corpus with LaBSE, see docs/similarity-engine.md):
    semantic_floor: float = 0.75  # never a paraphrase below this cosine
    semantic_standout: float = 0.15  # ...and must beat the passage's background by this much
    near_identical: float = 0.95  # at or above this, always a match (even if several reports share it)
    background_ranks: tuple[int, int] = (3, 8)  # which other reports form the background (0-based)
    lexical_min_overlap: float = 0.5  # share of a sentence's shingles that must reappear
    shortlist: int = 25  # candidates that get the (slower) lexical comparison
    max_matches: int = 10
    min_score: float = 0.02  # sources below this on every perspective are not reported
    evidence_per_match: int = 12
    lexical_weight: float = 0.5
    semantic_weight: float = 0.5
    moderate_level: float = 0.15
    high_level: float = 0.40


@dataclass
class _Candidate:
    doc_id: str
    best: dict[int, Hit]  # submitted passage index -> best hit in this source
    semantic: float = 0.0
    lexical: float = 0.0
    sentence_matches: list[tuple[str, SentenceMatch]] | None = None  # (submitted section, match)


def _round(value: float) -> float:
    return round(min(max(value, 0.0), 1.0), 4)


class Analyzer:
    def __init__(self, index: PassageIndex, encoder: Encoder, corpus: Corpus, config: AnalyzerConfig | None = None):
        if index.encoder_name != encoder.name:
            raise ValueError(f"index was built with {index.encoder_name}, not {encoder.name}")
        self.index = index
        self.encoder = encoder
        self.corpus = corpus
        self.config = config or AnalyzerConfig()

    def analyze(self, document: dict) -> AnalysisResult:
        cfg = self.config
        doc_id = str(document.get("doc_id", "submission"))
        parts = comparable_parts(document)
        stored = self.index.stored(doc_id)
        if stored:  # a corpus report: reuse its indexed passages instead of re-encoding them
            passages, vectors = stored
        else:
            passages = make_passages(document)
            vectors = self.encoder.encode([p.text for p in passages])
        total_words = sum(len(words(text)) for _, _, text in parts)
        notes: list[str] = []
        if not passages:
            notes.append("The report has too little readable text to compare.")

        exclude = doc_id if doc_id in self.corpus or doc_id in self.index.doc_ids else None
        hits_per_passage = self.index.search(vectors, cfg.neighbours, exclude_doc=exclude)
        background = [self._background_score(hits) for hits in hits_per_passage]

        candidates = self._semantic_candidates(passages, hits_per_passage, background, total_words)
        shortlist = sorted(candidates.values(), key=lambda c: self._semantic_strength(c), reverse=True)
        shortlist = shortlist[: cfg.shortlist]
        for candidate in shortlist:
            self._score_lexical(candidate, parts, total_words)

        matches = [
            self._match(candidate, passages, background)
            for candidate in shortlist
            if max(candidate.lexical, candidate.semantic) >= cfg.min_score
        ]
        matches.sort(key=lambda m: m.overall, reverse=True)
        matches = matches[: cfg.max_matches]

        summary = self._summary(matches, shortlist, passages, background, total_words)
        return AnalysisResult(
            document=DocumentInfo(
                id=doc_id,
                title=(document.get("meta") or {}).get("title"),
                words=total_words,
                passages=len(passages),
                language=document.get("language", "en"),
                flags=document.get("flags", []),
            ),
            summary=summary,
            matches=matches,
            corpus={"documents": len(self.index.doc_ids), "passages": len(self.index), "encoder": self.encoder.name},
            notes=notes,
        )

    # ── semantic ──────────────────────────────────────────

    def _background_score(self, hits: list[Hit]) -> float:
        """Typical similarity of this passage to reports it was not taken from."""
        per_report: dict[str, float] = {}
        for hit in hits:  # best first
            per_report.setdefault(hit.passage.doc_id, hit.score)
        start, end = self.config.background_ranks
        background = list(per_report.values())[start:end]
        return sum(background) / len(background) if background else 0.0

    def _is_close(self, hit: Hit, background: float) -> bool:
        cfg = self.config
        if hit.score >= cfg.near_identical:
            return True
        return hit.score >= cfg.semantic_floor and hit.score - background >= cfg.semantic_standout

    def _semantic_candidates(
        self, passages: list[Passage], hits_per_passage: list[list[Hit]], background: list[float], total_words: int
    ) -> dict[str, _Candidate]:
        candidates: dict[str, _Candidate] = {}
        for passage, hits in zip(passages, hits_per_passage, strict=True):
            for hit in hits:
                candidate = candidates.setdefault(hit.passage.doc_id, _Candidate(hit.passage.doc_id, {}))
                current = candidate.best.get(passage.index)
                if current is None or hit.score > current.score:
                    candidate.best[passage.index] = hit
        for candidate in candidates.values():
            close = sum(
                len(words(passages[i].text)) for i, hit in candidate.best.items() if self._is_close(hit, background[i])
            )
            candidate.semantic = _round(close / total_words) if total_words else 0.0
        return candidates

    def _semantic_strength(self, candidate: _Candidate) -> tuple[float, float]:
        # Coverage first; the sum of near-threshold scores breaks ties and surfaces
        # sources that are close without quite crossing the threshold.
        return candidate.semantic, sum(h.score for h in candidate.best.values())

    # ── lexical ───────────────────────────────────────────

    def _score_lexical(self, candidate: _Candidate, parts: list[tuple[str, str, str]], total_words: int) -> None:
        source = self.corpus.get(candidate.doc_id)
        if source is None:
            candidate.sentence_matches = []
            return
        matcher = ShingleMatcher([(title, text) for title, _, text in comparable_parts(source)])
        found = [
            (title, match)
            for title, _, text in parts
            for match in matcher.matches(text, self.config.lexical_min_overlap)
        ]
        candidate.sentence_matches = found
        reused = sum(len(words(m.query)) * m.overlap for _, m in found)
        candidate.lexical = _round(reused / total_words) if total_words else 0.0

    # ── assembly ──────────────────────────────────────────

    def _overall(self, lexical: float, semantic: float) -> float:
        cfg = self.config
        weighted = (cfg.lexical_weight * lexical + cfg.semantic_weight * semantic) / (
            cfg.lexical_weight + cfg.semantic_weight
        )
        # Verbatim reuse should never be averaged away by a lower semantic score.
        return _round(max(weighted, lexical))

    def _match(self, candidate: _Candidate, passages: list[Passage], background: list[float]) -> Match:
        evidence: list[Evidence] = [
            Evidence(
                perspective="lexical",
                score=_round(m.overlap),
                submitted=Excerpt(text=m.query, section=title),
                source=Excerpt(text=m.source, section=m.source_section),
            )
            for title, m in sorted(candidate.sentence_matches or [], key=lambda x: x[1].overlap, reverse=True)
        ]
        lexically_covered = {m.query for _, m in candidate.sentence_matches or []}
        for i, hit in sorted(candidate.best.items(), key=lambda item: item[1].score, reverse=True):
            if not self._is_close(hit, background[i]):
                continue
            passage = passages[i]
            if any(sentence in passage.text for sentence in lexically_covered):
                continue  # already shown as reused wording
            evidence.append(
                Evidence(
                    perspective="semantic",
                    score=_round(hit.score),
                    submitted=Excerpt(text=passage.text, section=passage.section),
                    source=Excerpt(text=hit.passage.text, section=hit.passage.section),
                )
            )
        evidence.sort(key=lambda e: e.score, reverse=True)
        return Match(
            source=SourceInfo(**self.corpus.meta(candidate.doc_id)),
            overall=self._overall(candidate.lexical, candidate.semantic),
            scores=PerspectiveScores(lexical=candidate.lexical, semantic=candidate.semantic),
            evidence=evidence[: self.config.evidence_per_match],
        )

    def _summary(
        self,
        matches: list[Match],
        shortlist: list[_Candidate],
        passages: list[Passage],
        background: list[float],
        total_words: int,
    ) -> AnalysisSummary:
        cfg = self.config
        reused_sentences: dict[str, float] = defaultdict(float)
        paraphrased: set[int] = set()
        for candidate in shortlist:
            for _, m in candidate.sentence_matches or []:
                reused_sentences[m.query] = max(reused_sentences[m.query], m.overlap)
            paraphrased |= {i for i, hit in candidate.best.items() if self._is_close(hit, background[i])}
        lexical = sum(len(words(s)) * o for s, o in reused_sentences.items())
        semantic = sum(len(words(passages[i].text)) for i in paraphrased)
        overall = max((m.overall for m in matches), default=0.0)
        level = "high" if overall >= cfg.high_level else "moderate" if overall >= cfg.moderate_level else "low"
        return AnalysisSummary(
            overall=overall,
            lexical_coverage=_round(lexical / total_words) if total_words else 0.0,
            semantic_coverage=_round(semantic / total_words) if total_words else 0.0,
            level=level,
        )
