"""Compare embedding models on hand-labelled passage pairs (data/eval/model_probe.json).

    python scripts/compare_models.py sentence-transformers/LaBSE intfloat/multilingual-e5-small

For each model, prints the cosine of every pair and the margin: the lowest 'reuse'
score minus the highest 'different' score. A good model for Parallax has a wide
positive margin, so one threshold separates reuse from text that merely shares a topic.
Needs the passages from build_index.py (data/embeddings/passages.jsonl).
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402

PROBE = settings.data_dir / "eval" / "model_probe.json"


def load_passages() -> dict[tuple[str, str], str]:
    passages: dict[tuple[str, str], str] = {}
    with (settings.index_dir / "passages.jsonl").open(encoding="utf-8") as fh:
        for line in fh:
            p = json.loads(line)
            passages.setdefault((p["doc_id"], p["section"]), p["text"])
    return passages


def resolve(side: dict, passages: dict[tuple[str, str], str]) -> str:
    if "text" in side:
        return side["text"]
    if "ref" in side:
        return passages[tuple(side["ref"])]
    doc_id, prefix = side["ref_prefix"]
    return next(t for (d, s), t in passages.items() if d == doc_id and s.lower().startswith(prefix))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("models", nargs="+")
    args = parser.parse_args()

    from sentence_transformers import SentenceTransformer

    passages = load_passages()
    pairs = json.loads(PROBE.read_text(encoding="utf-8"))["pairs"]
    texts = [(resolve(p["a"], passages), resolve(p["b"], passages)) for p in pairs]

    for name in args.models:
        model = SentenceTransformer(name)
        prefix = "query: " if "e5" in name else ""  # e5 models expect a task prefix
        scores = []
        for a, b in texts:
            va, vb = model.encode([prefix + a, prefix + b], normalize_embeddings=True)
            scores.append(float(va @ vb))
        reuse = [s for s, p in zip(scores, pairs, strict=True) if p["label"] == "reuse"]
        different = [s for s, p in zip(scores, pairs, strict=True) if p["label"] == "different"]
        started = time.time()
        model.encode([texts[0][1]] * 64, batch_size=64)
        speed = 64 / (time.time() - started)
        print(f"\n{name}  margin {min(reuse) - max(different):+.3f}  ({speed:.0f} passages/s on this machine)")
        for score, pair in zip(scores, pairs, strict=True):
            print(f"  {score:.3f}  {pair['label']:<9} {pair['name']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
