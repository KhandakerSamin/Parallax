"""Compare every corpus report with all the others (leave-one-out).

    python scripts/scan_corpus.py                        # default thresholds
    python scripts/scan_corpus.py --semantic-threshold 0.85 --limit 50

Prints the score distribution and the strongest pairs, and writes every report's
top matches to data/processed/_scan.json (git-ignored). Used to calibrate the
thresholds and to find real cases of potential similarity for evaluation.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from collections import Counter
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.services.engine import Engine  # noqa: E402


def percentiles(values: list[float]) -> str:
    if not values:
        return "n/a"
    qs = statistics.quantiles(values, n=100, method="inclusive") if len(values) > 1 else values * 99
    return " ".join(f"p{p}={qs[p - 1]:.3f}" for p in (50, 75, 90, 95, 99)) + f" max={max(values):.3f}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--semantic-threshold", type=float)
    parser.add_argument("--limit", type=int, help="scan only the first N reports")
    parser.add_argument("--top", type=int, default=15, help="pairs to print")
    args = parser.parse_args()

    engine = Engine.load(settings.data_dir)
    analyzer = engine.analyzer
    if args.semantic_threshold is not None:
        analyzer.config = replace(analyzer.config, semantic_threshold=args.semantic_threshold)
    doc_ids = sorted(analyzer.corpus.documents)[: args.limit]

    started = time.time()
    rows = []
    for n, doc_id in enumerate(doc_ids, 1):
        result = analyzer.analyze(analyzer.corpus.get(doc_id))
        rows.append(
            {
                "id": doc_id,
                "overall": result.summary.overall,
                "level": result.summary.level,
                "lexical_coverage": result.summary.lexical_coverage,
                "semantic_coverage": result.summary.semantic_coverage,
                "matches": [
                    {"id": m.source.id, "overall": m.overall, **m.scores.model_dump()} for m in result.matches[:5]
                ],
            }
        )
        if n % 25 == 0:
            print(f"  {n}/{len(doc_ids)} scanned ({time.time() - started:.0f}s)")

    out = settings.processed_dir / "_scan.json"
    out.write_text(json.dumps({"config": analyzer.config.__dict__, "reports": rows}, indent=1), encoding="utf-8")

    top_lexical = [max((m["lexical"] for m in r["matches"]), default=0.0) for r in rows]
    top_semantic = [max((m["semantic"] for m in r["matches"]), default=0.0) for r in rows]
    levels = Counter(r["level"] for r in rows)
    print(
        f"\nScanned {len(rows)} reports in {time.time() - started:.0f}s "
        f"(semantic threshold {analyzer.config.semantic_threshold})"
    )
    print(f"top lexical  : {percentiles(top_lexical)}")
    print(f"top semantic : {percentiles(top_semantic)}")
    print(f"levels       : {dict(levels)}")

    pairs: dict[tuple[str, str], dict] = {}
    for r in rows:
        for m in r["matches"]:
            key = tuple(sorted((r["id"], m["id"])))
            if key not in pairs or m["overall"] > pairs[key]["overall"]:
                pairs[key] = m
    print("\nstrongest pairs (overall / lexical / semantic):")
    for (a, b), m in sorted(pairs.items(), key=lambda kv: kv[1]["overall"], reverse=True)[: args.top]:
        print(f"  {a} ~ {b}: {m['overall']:.3f} / {m['lexical']:.3f} / {m['semantic']:.3f}")
    print(f"\nWrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
