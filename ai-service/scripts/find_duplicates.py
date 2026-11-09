"""Find reports the repository holds more than once and leave the extra copies out.

    python scripts/find_duplicates.py              # write data/processed/_duplicates.json, prune the index
    python scripts/find_duplicates.py --dry-run    # only report what it would do

Run it after extract_corpus.py. The corpus loader skips the copies listed in
_duplicates.json, and their passages are removed from the existing index, so the
index does not need to be rebuilt.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.embeddings.index import PassageIndex  # noqa: E402
from app.extraction.duplicates import find_duplicates  # noqa: E402
from app.services.corpus import DUPLICATES_FILE, Corpus  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    corpus = Corpus.load(settings.processed_dir, skip_duplicates=False)
    copies = find_duplicates(corpus)
    print(f"{len(corpus)} reports: {len(copies)} extra copies of {len(set(copies.values()))} reports")
    for copy, kept in sorted(copies.items(), key=lambda kv: kv[1])[:10]:
        print(f"  {copy} is a copy of {kept}: {corpus.meta(kept)['title'][:70]}")
    if args.dry_run:
        return 0

    out = settings.processed_dir / DUPLICATES_FILE
    out.write_text(json.dumps(dict(sorted(copies.items())), indent=1) + "\n", encoding="utf-8")
    print(f"Wrote {out}")

    if (settings.index_dir / "manifest.json").exists():
        index = PassageIndex.load(settings.index_dir)
        removed = index.drop(set(copies))
        if removed:
            index.save(settings.index_dir)
        print(f"Removed {removed:,} passages from the index; {len(index):,} remain")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
