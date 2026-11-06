"""Extract every harvested PDF into a clean JSON document.

    python scripts/extract_corpus.py            # new or changed PDFs only
    python scripts/extract_corpus.py --force    # re-extract everything

Reads   data/raw/<id>.pdf + data/metadata/corpus.jsonl (from harvest_dspace.py)
Writes  data/processed/<id>.json          one structured document per report (git-ignored)
        data/processed/_boilerplate.json  sentences shared by much of the corpus
        data/metadata/extraction_summary.json  corpus statistics (committed)
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from collections import Counter
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.extraction.boilerplate import find_boilerplate, strip_boilerplate  # noqa: E402
from app.extraction.document import extract_document  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
METADATA = ROOT / "data" / "metadata" / "corpus.jsonl"
SUMMARY = ROOT / "data" / "metadata" / "extraction_summary.json"

META_FIELDS = ("title", "authors", "supervisor", "date_issued", "type", "subjects", "url", "handle")


def load_metadata() -> dict[str, dict]:
    if not METADATA.exists():
        return {}
    with METADATA.open(encoding="utf-8") as fh:
        records = (json.loads(line) for line in fh if line.strip())
        return {r["id"]: r for r in records}


def extract_all(force: bool) -> tuple[int, int, list[str]]:
    metadata = load_metadata()
    PROCESSED.mkdir(parents=True, exist_ok=True)
    extracted = skipped = 0
    failed: list[str] = []
    pdfs = sorted(RAW.glob("*.pdf"))
    for i, pdf in enumerate(pdfs, 1):
        out = PROCESSED / f"{pdf.stem}.json"
        if not force and out.exists() and out.stat().st_mtime >= pdf.stat().st_mtime:
            skipped += 1
            continue
        try:
            document = extract_document(pdf)
        except Exception as exc:  # a corrupt PDF must not stop the batch
            failed.append(pdf.stem)
            print(f"[{i}/{len(pdfs)}] {pdf.stem}: FAILED ({exc})")
            continue
        data = document.to_dict()
        meta = metadata.get(pdf.stem, {})
        data["meta"] = {key: meta.get(key) for key in META_FIELDS}
        out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        extracted += 1
        print(f"[{i}/{len(pdfs)}] {pdf.stem}: {data['stats']['body_words']} words, {','.join(data['flags']) or 'ok'}")
    return extracted, skipped, failed


def processed_documents() -> list[tuple[Path, dict]]:
    return [(p, json.loads(p.read_text(encoding="utf-8"))) for p in sorted(PROCESSED.glob("[!_]*.json"))]


def remove_boilerplate(docs: list[tuple[Path, dict]]) -> dict[str, int]:
    texts = [d["abstract"] + " " + " ".join(s["text"] for s in d["sections"]) for _, d in docs]
    boilerplate = find_boilerplate(texts)
    (PROCESSED / "_boilerplate.json").write_text(
        json.dumps(boilerplate, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    if boilerplate:
        for path, doc in docs:
            doc["abstract"] = strip_boilerplate(doc["abstract"], boilerplate)
            for section in doc["sections"]:
                section["text"] = strip_boilerplate(section["text"], boilerplate)
            path.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    return boilerplate


def write_summary(docs: list[tuple[Path, dict]], boilerplate: dict[str, int], failed: list[str]) -> dict:
    rows = [
        {
            "id": doc["doc_id"],
            "year": (doc["meta"].get("date_issued") or "")[:4] or None,
            "pages": doc["page_count"],
            "words": doc["stats"]["body_words"],
            "chapters": doc["stats"]["chapters"],
            "references": doc["stats"]["references"],
            "language": doc["language"],
            "flags": doc["flags"],
        }
        for _, doc in docs
    ]
    words = [r["words"] for r in rows] or [0]
    summary = {
        "generated": date.today().isoformat(),
        "documents": len(rows),
        "failed": failed,
        "total_words": sum(words),
        "median_words": int(statistics.median(words)),
        "languages": dict(Counter(r["language"] for r in rows)),
        "flags": dict(Counter(flag for r in rows for flag in r["flags"])),
        "outlines": dict(Counter(" > ".join(doc["outline"]) for _, doc in docs).most_common(10)),
        "boilerplate_sentences": len(boilerplate),
        "documents_detail": rows,
    }
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--force", action="store_true", help="re-extract PDFs that were already processed")
    args = parser.parse_args()

    started = time.time()
    extracted, skipped, failed = extract_all(args.force)
    docs = processed_documents()
    boilerplate = remove_boilerplate(docs)
    summary = write_summary(docs, boilerplate, failed)
    print(
        f"\nExtracted {extracted}, unchanged {skipped}, failed {len(failed)} in {time.time() - started:.0f}s. "
        f"Corpus: {summary['documents']} documents, {summary['total_words']:,} words "
        f"(median {summary['median_words']:,}); boilerplate sentences: {len(boilerplate)}; flags: {summary['flags']}"
    )
    return 1 if failed and not docs else 0


if __name__ == "__main__":
    raise SystemExit(main())
