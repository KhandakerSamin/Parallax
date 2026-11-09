"""Concept perspective: do two reports revolve around the same key ideas?

Each report is summarised by its **key terms**: the single words and two-word
phrases that are frequent in it but rare across the corpus (TF-IDF). Two reports
share concepts when their key-term profiles point the same way (cosine).

Terms that most reports use ("system", "user", "data", the DIU template) carry
almost no weight, so the score reflects distinctive ideas such as "adasyn",
"il-4 peptides" or "ransomware detection", not the common vocabulary of a
software engineering report.

Limitation: terms are compared as written, so a Bangla report and its English
source share few terms. The semantic perspective covers translation.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass

# Common English function words and report filler; anything else generic is
# handled by document frequency.
STOPWORDS = frozenset(
    """
    a about above after again against all also am an and any are as at be because been before being below
    between both but by can could did do does doing down during each either etc few for from further had has
    have having he her here hers him his how however i if in into is it its itself just let may me might more
    most much must my no nor not now of off often on once one only or other our ours out over own per same
    shall she should since so some such than that the their theirs them then there therefore these they this
    those though through thus to too under until up upon us use used uses using very via was we were what when
    where whether which while who whom whose why will with within without would yet you your
    figure fig table chapter section page pages shown show shows based different various several many new
    first second third fourth fifth also another make made makes making well within like e.g i.e et al
    """.split()
)

# Bangla function words that appear in almost every sentence.
BANGLA_STOPWORDS = frozenset("এবং ও এই একটি যে যা করে করা হয় হয়েছে তার জন্য থেকে এর সাথে না কিন্তু বা আমরা আমাদের".split())

TOKEN = re.compile(r"[a-z][a-z0-9\-]*[a-z0-9]|[ঀ-৿]+")


def tokens(text: str) -> list[str]:
    """Lower-cased word tokens (English and Bangla), without stop words or short fragments."""
    found = TOKEN.findall(text.lower())
    return [t for t in found if len(t) > 2 and t not in STOPWORDS and t not in BANGLA_STOPWORDS]


def terms(text: str) -> Counter[str]:
    """Counts of single words and adjacent two-word phrases."""
    words = tokens(text)
    counts = Counter(words)
    counts.update(f"{a} {b}" for a, b in zip(words, words[1:], strict=False) if a != b)
    return counts


def document_text(document: dict) -> str:
    """The text a report's concepts are drawn from: title, abstract and body sections."""
    parts = [(document.get("meta") or {}).get("title") or "", document.get("abstract") or ""]
    parts += [s.get("title", "") + "\n" + s.get("text", "") for s in document.get("sections", [])]
    return "\n".join(parts)


@dataclass(frozen=True)
class ConceptProfile:
    """A report's key terms with their TF-IDF weights, unit length."""

    weights: dict[str, float]

    def top(self, n: int) -> list[str]:
        return sorted(self.weights, key=self.weights.__getitem__, reverse=True)[:n]


@dataclass(frozen=True)
class ConceptMatch:
    score: float
    shared: list[str]  # the shared key terms, strongest first


class ConceptModel:
    """Document frequencies from the corpus, used to weigh each report's terms."""

    def __init__(
        self,
        documents: Iterable[dict],
        *,
        key_terms: int = 40,
        max_document_share: float = 0.35,
        min_documents: int = 2,
    ) -> None:
        self.key_terms = key_terms
        self.profiles: dict[str, ConceptProfile] = {}
        if iter(documents) is documents:  # a one-shot iterator: keep it, since it is read twice
            documents = list(documents)
        # Two passes, so the term counts of every report are never held at once
        # (with ~2,000 reports that alone would be about a gigabyte).
        df: Counter[str] = Counter()
        self.size = 0
        for document in documents:
            df.update(terms(document_text(document)).keys())
            self.size += 1
        cap = max_document_share * self.size
        # Terms used by too many reports are generic; terms seen once may be typos or names.
        # A tiny corpus (tests, early setups) keeps everything so there is something to compare.
        self.idf = {
            term: math.log((1 + self.size) / (1 + n)) + 1.0
            for term, n in df.items()
            if self.size < 10 or (min_documents <= n <= cap)
        }
        del df
        for document in documents:
            self.profiles[str(document["doc_id"])] = self.profile_from_counts(terms(document_text(document)))

    def profile_from_counts(self, counts: Counter[str]) -> ConceptProfile:
        scored = {term: (1.0 + math.log(count)) * self.idf[term] for term, count in counts.items() if term in self.idf}
        top = sorted(scored, key=scored.__getitem__, reverse=True)[: self.key_terms]
        norm = math.sqrt(sum(scored[t] ** 2 for t in top)) or 1.0
        return ConceptProfile({t: scored[t] / norm for t in top})

    def profile(self, document: dict) -> ConceptProfile:
        doc_id = str(document.get("doc_id", ""))
        if doc_id in self.profiles:
            return self.profiles[doc_id]
        return self.profile_from_counts(terms(document_text(document)))

    def compare(self, a: ConceptProfile, b: ConceptProfile, *, shared_terms: int = 12) -> ConceptMatch:
        common = a.weights.keys() & b.weights.keys()
        score = sum(a.weights[t] * b.weights[t] for t in common)
        shared = sorted(common, key=lambda t: a.weights[t] * b.weights[t], reverse=True)
        # Prefer phrases, and drop a single word already shown inside a phrase.
        phrases = [t for t in shared if " " in t]
        singles = [t for t in shared if " " not in t and not any(t in p.split() for p in phrases)]
        ordered = sorted(phrases + singles, key=lambda t: a.weights[t] * b.weights[t], reverse=True)
        return ConceptMatch(score=round(min(score, 1.0), 4), shared=ordered[:shared_terms])
