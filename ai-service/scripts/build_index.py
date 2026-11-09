"""Embed every extracted report and build the semantic search index.

    python scripts/build_index.py                  # multilingual sentence model
    python scripts/build_index.py --encoder hashing  # no model download (for quick checks)

Reads   data/processed/<id>.json  (from extract_corpus.py)
Writes  data/embeddings/          index.faiss, passages.jsonl, manifest.json (git-ignored)
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.embeddings.encoder import DEFAULT_MODEL, HashingEncoder, SentenceEncoder  # noqa: E402
from app.embeddings.index import PassageIndex  # noqa: E402
from app.embeddings.passages import make_passages  # noqa: E402
from app.services.corpus import Corpus  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--encoder", choices=["sentence", "hashing"], default="sentence")
    parser.add_argument("--model", default=settings.embedding_model or DEFAULT_MODEL)
    parser.add_argument("--out", type=Path, default=settings.index_dir)
    args = parser.parse_args()

    started = time.time()
    corpus = Corpus.load(settings.processed_dir)
    passages = [p for doc in corpus for p in make_passages(doc)]
    if not passages:
        print(f"No passages: run scripts/extract_corpus.py first (looked in {settings.processed_dir}).")
        return 1
    print(f"{len(corpus)} documents -> {len(passages):,} passages")

    encoder = HashingEncoder() if args.encoder == "hashing" else SentenceEncoder(args.model)
    vectors = encoder.encode([p.text for p in passages], show_progress=True)
    index = PassageIndex(encoder.dim, encoder.name)
    index.add(passages, vectors)
    index.save(args.out)
    print(f"Indexed {len(index):,} passages with {encoder.name} into {args.out} in {time.time() - started:.0f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
