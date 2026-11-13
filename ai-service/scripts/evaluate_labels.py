"""Human-labelled evaluation on real corpus pairs.

    python scripts/evaluate_labels.py sheet     # write data/eval/label-pairs.csv to fill in
    python scripts/evaluate_labels.py score     # precision / recall from the filled-in sheet

`sheet` picks report pairs from the last corpus scan (scripts/scan_corpus.py), spread
over high, moderate and low scores, so the sheet is not just the easy cases. Each row
links both reports. A reviewer opens them and writes one label in the `label` column:

    reuse       text was copied or closely reworded from one report into the other
    topic       same subject or project idea, but written independently
    unrelated   nothing meaningful in common

Labellers should not look at the scores first (the sheet lists them last for that reason).

`score` treats "reuse" as the positive class and reports, for the overall score and for
each perspective, precision and recall when a pair counts as flagged at the moderate
level (0.15), plus the best threshold found on these labels.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.services.corpus import Corpus  # noqa: E402

SHEET = settings.data_dir / "eval" / "label-pairs.csv"
LABELS = ("reuse", "topic", "unrelated")
PERSPECTIVES = ("overall", "lexical", "semantic", "concept", "structural")
STRATA = (("high", 0.40, 1.01, 15), ("moderate", 0.15, 0.40, 15), ("low", 0.02, 0.15, 10))
MODERATE = 0.15


def scan_pairs() -> dict[tuple[str, str], dict]:
    scan_file = settings.processed_dir / "_scan.json"
    if not scan_file.exists():
        raise SystemExit("No corpus scan found. Run scripts/scan_corpus.py --sample 400 first.")
    pairs: dict[tuple[str, str], dict] = {}
    for report in json.loads(scan_file.read_text(encoding="utf-8"))["reports"]:
        for match in report["matches"]:
            key = tuple(sorted((report["id"], match["id"])))
            if key not in pairs or match["overall"] > pairs[key]["overall"]:
                pairs[key] = match
    return pairs


def make_sheet(seed: int) -> int:
    if SHEET.exists():
        print(f"{SHEET} already exists; delete it first to draw new pairs (labels would be lost).")
        return 1
    corpus, pairs, rng = Corpus.load(settings.processed_dir), scan_pairs(), random.Random(seed)
    chosen = []
    for _, low, high, count in STRATA:
        band = [key for key, m in pairs.items() if low <= m["overall"] < high]
        chosen += rng.sample(band, min(count, len(band)))
    rng.shuffle(chosen)  # mix the strata so the order gives nothing away

    SHEET.parent.mkdir(parents=True, exist_ok=True)
    with SHEET.open("w", newline="", encoding="utf-8-sig") as fh:  # -sig: opens cleanly in Excel
        writer = csv.writer(fh)
        writer.writerow(["pair", "title_a", "link_a", "title_b", "link_b", "label", "notes", *PERSPECTIVES])
        for n, (a, b) in enumerate(chosen, 1):
            meta_a, meta_b, scores = corpus.meta(a), corpus.meta(b), pairs[(a, b)]
            writer.writerow(
                [n, meta_a["title"], meta_a["url"], meta_b["title"], meta_b["url"], "", ""]
                + [f"{scores.get(p, 0.0):.3f}" for p in PERSPECTIVES]
            )
    print(f"Wrote {len(chosen)} pairs to {SHEET}. Fill in the label column with: {', '.join(LABELS)}")
    return 0


def precision_recall(rows: list[dict], key: str, threshold: float) -> tuple[float, float]:
    flagged = [r for r in rows if float(r[key]) >= threshold]
    positives = [r for r in rows if r["label"] == "reuse"]
    hits = sum(r["label"] == "reuse" for r in flagged)
    return (hits / len(flagged) if flagged else 0.0), (hits / len(positives) if positives else 0.0)


def score() -> int:
    if not SHEET.exists():
        raise SystemExit(f"No sheet at {SHEET}. Run `evaluate_labels.py sheet` first.")
    with SHEET.open(encoding="utf-8-sig") as fh:
        rows = [r for r in csv.DictReader(fh) if r["label"].strip()]
    for r in rows:
        r["label"] = r["label"].strip().lower()
        if r["label"] not in LABELS:
            raise SystemExit(f"Pair {r['pair']}: unknown label {r['label']!r} (use {', '.join(LABELS)})")
    if not rows:
        raise SystemExit("No labels yet.")
    counts = {label: sum(r["label"] == label for r in rows) for label in LABELS}
    print(f"{len(rows)} labelled pairs: " + ", ".join(f"{n} {label}" for label, n in counts.items()))
    print(f"\n{'perspective':<12}{'precision @0.15':>17}{'recall @0.15':>14}   best threshold (F1)")
    for key in PERSPECTIVES:
        p, r = precision_recall(rows, key, MODERATE)
        best = max(
            ((t / 100, *precision_recall(rows, key, t / 100)) for t in range(1, 100)),
            key=lambda x: 2 * x[1] * x[2] / (x[1] + x[2]) if x[1] + x[2] else 0.0,
        )
        print(f"{key:<12}{p:>17.0%}{r:>14.0%}   {best[0]:.2f} (P {best[1]:.0%}, R {best[2]:.0%})")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=["sheet", "score"])
    parser.add_argument("--seed", type=int, default=331)
    args = parser.parse_args()
    return make_sheet(args.seed) if args.command == "sheet" else score()


if __name__ == "__main__":
    raise SystemExit(main())
