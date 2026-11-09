"""Embed every extracted report and build the semantic search index.

    python scripts/build_index.py                  # multilingual sentence model
    python scripts/build_index.py --encoder hashing  # no model download (for quick checks)

Reads   data/processed/<id>.json  (from extract_corpus.py)
Writes  data/embeddings/          index.faiss, passages.jsonl, manifest.json (git-ignored)

Embeddings are saved in chunks to <out>-partial/ as they are made, so a run that is
stopped (power cut, Ctrl+C) picks up from the last finished chunk when started again.
"""

from __future__ import annotations

import argparse
import hashlib
import shutil
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.embeddings.encoder import DEFAULT_MODEL, HashingEncoder, SentenceEncoder  # noqa: E402
from app.embeddings.index import PRECISIONS, PassageIndex  # noqa: E402
from app.embeddings.passages import make_passages  # noqa: E402
from app.services.corpus import Corpus  # noqa: E402

CHUNK = 6400  # passages per saved chunk: about 12 minutes on a laptop CPU


def fingerprint(encoder_name: str, texts: list[str]) -> str:
    """Identifies the exact passages and model, so stale chunks are never reused."""
    digest = hashlib.sha256(encoder_name.encode("utf-8"))
    for text in texts:
        digest.update(b"\n" + text.encode("utf-8"))
    return digest.hexdigest()


def encode_resumable(encoder, texts: list[str], folder: Path) -> np.ndarray:
    """Encode in chunks, saving each one, and skip chunks a previous run already saved."""
    folder.mkdir(parents=True, exist_ok=True)
    stamp = folder / "fingerprint.txt"
    expected = fingerprint(encoder.name, texts)
    if not stamp.exists() or stamp.read_text(encoding="utf-8").strip() != expected:
        for old in folder.glob("chunk-*"):
            old.unlink()
        stamp.write_text(expected, encoding="utf-8")

    total = (len(texts) + CHUNK - 1) // CHUNK
    parts = []
    for number, start in enumerate(range(0, len(texts), CHUNK)):
        path = folder / f"chunk-{number:04d}.npy"
        if path.exists():
            parts.append(np.load(path))
            print(f"chunk {number + 1}/{total}: already done", flush=True)
            continue
        began = time.time()
        vectors = encoder.encode(texts[start : start + CHUNK])
        temporary = folder / f"chunk-{number:04d}.tmp.npy"
        np.save(temporary, vectors)
        temporary.replace(path)  # only complete chunks ever carry the final name
        parts.append(vectors)
        print(f"chunk {number + 1}/{total}: done in {time.time() - began:.0f}s", flush=True)
    return np.concatenate(parts)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--encoder", choices=["sentence", "hashing"], default="sentence")
    parser.add_argument("--model", default=settings.embedding_model or DEFAULT_MODEL)
    parser.add_argument("--out", type=Path, default=settings.index_dir)
    parser.add_argument("--precision", choices=PRECISIONS, default="float16")
    args = parser.parse_args()

    started = time.time()
    corpus = Corpus.load(settings.processed_dir)
    passages = [p for doc in corpus for p in make_passages(doc)]
    if not passages:
        print(f"No passages: run scripts/extract_corpus.py first (looked in {settings.processed_dir}).")
        return 1
    print(f"{len(corpus)} documents -> {len(passages):,} passages")

    encoder = HashingEncoder() if args.encoder == "hashing" else SentenceEncoder(args.model)
    partial = args.out.with_name(args.out.name + "-partial")
    vectors = encode_resumable(encoder, [p.text for p in passages], partial)
    index = PassageIndex(encoder.dim, encoder.name, args.precision)
    index.add(passages, vectors)
    index.save(args.out)
    shutil.rmtree(partial, ignore_errors=True)
    print(f"Indexed {len(index):,} passages with {encoder.name} into {args.out} in {time.time() - started:.0f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
