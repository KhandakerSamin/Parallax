"""Planted-reuse evaluation: does Parallax find text we know was copied?

    python scripts/evaluate_planted.py                # 15 report pairs per condition
    python scripts/evaluate_planted.py --pairs 5      # a quick run

Each trial takes a corpus report (the "base"), pastes in a block of text from a
different corpus report (the "source") as a new section, and analyses the result as a
new submission. The share of planted words and the way they were copied are known,
so the results can be checked:

    verbatim   the block is pasted as it is
    edited     every 6th word dropped and neighbouring sentences swapped, a cheap disguise
    share 0    nothing planted: the source must NOT be reported (false alarms)

The base report itself is in the corpus and matches the submission completely; it is
ignored, so the question is only whether the planted source is found.

Writes data/eval/planted.json and prints a summary table.
"""

from __future__ import annotations

import argparse
import copy
import json
import random
import re
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.embeddings.passages import comparable_parts  # noqa: E402
from app.services.engine import get_engine  # noqa: E402

SHARES = (0.05, 0.10, 0.20, 0.40)
MIN_WORDS = 2500  # long enough to take a 40% block from
SENTENCE = re.compile(r"(?<=[.!?।])\s+")


def body(document: dict) -> str:
    return " ".join(text for _, _, text in comparable_parts(document))


def take_block(text: str, words_wanted: int, rng: random.Random) -> str:
    """A run of whole sentences from the middle of ``text`` with about ``words_wanted`` words."""
    sentences = [s for s in SENTENCE.split(text) if len(s.split()) >= 4]
    start = rng.randrange(max(1, len(sentences) // 4), max(2, len(sentences) // 2))
    block, count = [], 0
    for sentence in sentences[start:] + sentences[:start]:
        block.append(sentence)
        count += len(sentence.split())
        if count >= words_wanted:
            break
    return " ".join(block)


def disguise(block: str) -> str:
    """Drop every 6th word and swap neighbouring sentences."""
    sentences = SENTENCE.split(block)
    for i in range(0, len(sentences) - 1, 2):
        sentences[i], sentences[i + 1] = sentences[i + 1], sentences[i]
    words = " ".join(sentences).split()
    return " ".join(w for i, w in enumerate(words, 1) if i % 6)


def submission(base: dict, block: str) -> dict:
    document = copy.deepcopy(base)
    document["doc_id"] = "submission"
    document["meta"] = {"title": "planted"}
    sections = document.get("sections", [])
    middle = len(sections) // 2
    sections.insert(middle, {"title": "Literature Review", "kind": "other", "chapter_kind": "other", "text": block})
    document["sections"] = sections
    return document


def run_trial(analyzer, base: dict, source: dict, share: float, mode: str, rng: random.Random) -> dict:
    base_words = len(body(base).split())
    wanted = round(base_words * share / (1 - share)) if share else 0
    block = take_block(body(source), wanted, rng) if wanted else ""
    if mode == "edited" and block:
        block = disguise(block)
    planted_words = len(block.split())
    result = analyzer.analyze(submission(base, block))
    others = [m for m in result.matches if m.source.id != str(base["doc_id"])]
    hit = next((m for m in others if m.source.id == str(source["doc_id"])), None)
    return {
        "base": str(base["doc_id"]),
        "source": str(source["doc_id"]),
        "mode": mode,
        "share": share,
        "true_share": round(planted_words / (base_words + planted_words), 4) if planted_words else 0.0,
        "found": hit is not None,
        "rank": others.index(hit) + 1 if hit else None,
        "overall": hit.overall if hit else 0.0,
        "lexical": hit.scores.lexical if hit else 0.0,
        "semantic": hit.scores.semantic if hit else 0.0,
        "level_ok": bool(hit and hit.overall >= analyzer.config.moderate_level),
    }


def summarise(rows: list[dict]) -> list[str]:
    lines = [
        f"{'condition':<18}{'trials':>7}{'found':>8}{'top-1':>8}{'true share':>12}{'estimated':>11}"
        f"{'lexical':>9}{'semantic':>10}"
    ]
    for mode in ("verbatim", "edited"):
        for share in SHARES:
            group = [r for r in rows if r["mode"] == mode and r["share"] == share]
            if not group:
                continue
            found = sum(r["found"] for r in group)
            top1 = sum(r["rank"] == 1 for r in group)
            lines.append(
                f"{mode + f' {share:.0%}':<18}{len(group):>7}{found / len(group):>8.0%}{top1 / len(group):>8.0%}"
                f"{statistics.mean(r['true_share'] for r in group):>12.1%}"
                f"{statistics.mean(r['overall'] for r in group):>11.1%}"
                f"{statistics.mean(r['lexical'] for r in group):>9.1%}"
                f"{statistics.mean(r['semantic'] for r in group):>10.1%}"
            )
    controls = [r for r in rows if r["share"] == 0]
    if controls:
        alarms = sum(r["found"] for r in controls)
        lines.append(f"{'nothing planted':<18}{len(controls):>7}   false alarms: {alarms} of {len(controls)}")
    return lines


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pairs", type=int, default=15, help="report pairs per condition")
    parser.add_argument("--seed", type=int, default=331)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    analyzer = get_engine().analyzer
    corpus = analyzer.corpus
    long_ids = [i for i in corpus.ids() if len(body(corpus.get(i)).split()) >= MIN_WORDS]
    print(f"{len(long_ids)} corpus reports have at least {MIN_WORDS:,} words; using {args.pairs} pairs per condition")

    conditions = [("verbatim", s) for s in SHARES] + [("edited", s) for s in SHARES] + [("verbatim", 0.0)]
    rows, started = [], time.time()
    for mode, share in conditions:
        for _ in range(args.pairs):
            base_id, source_id = rng.sample(long_ids, 2)
            rows.append(run_trial(analyzer, corpus.get(base_id), corpus.get(source_id), share, mode, rng))
        print(f"  {mode} {share:.0%} done ({time.time() - started:.0f}s)", flush=True)

    out = settings.data_dir / "eval" / "planted.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"seed": args.seed, "trials": rows}, indent=1) + "\n", encoding="utf-8")
    print()
    print("\n".join(summarise(rows)))
    print(f"\nWrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
