"""Harvest thesis/project/report metadata and PDFs from the DIU DSpace repository.

Builds the reference corpus that Parallax searches for similar work.

Polite by design:
  * identifies itself with a descriptive User-Agent
  * waits between every request (default 3 s)
  * caps the number of items per run (default 50)
  * only uses paths allowed by the site's robots.txt (/handle, /bitstream)
  * skips items already harvested, so re-runs are cheap

Output:
  data/raw/<handle_id>.pdf            full-text PDF (git-ignored)
  data/metadata/corpus.jsonl          one JSON record per item

Usage (from the repo root):
  python ai-service/scripts/harvest_dspace.py --dept swe --limit 30
  python ai-service/scripts/harvest_dspace.py --dept cse --limit 30 --no-pdf
"""

from __future__ import annotations

import argparse
import html
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = "https://dspace.daffodilvarsity.edu.bd"
USER_AGENT = "ParallaxCapstone/0.1 (academic plagiarism-detection project, DIU)"

# Community handles for departments (from the repository's OAI ListSets).
DEPARTMENTS = {
    "swe": "123456789/36",   # Department of Software Engineering
    "cse": "123456789/34",   # Department of Computer Science and Engineering
}

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = REPO_ROOT / "data" / "raw"
META_FILE = REPO_ROOT / "data" / "metadata" / "corpus.jsonl"


RETRIES = 3


def fetch(url: str, delay: float) -> bytes:
    """GET with a polite delay. Dropped connections and server errors are retried
    with a growing back-off (delay × 4, × 8); a 404 is not retried."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(RETRIES):
        time.sleep(delay * (2 ** (attempt + 1) if attempt else 1))
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except urllib.error.HTTPError as exc:
            if exc.code < 500 or attempt == RETRIES - 1:
                raise
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            if attempt == RETRIES - 1:
                raise
    raise RuntimeError("unreachable")


def browse_item_handles(community: str, offset: int, rpp: int, delay: float) -> list[str]:
    """Return item handles listed on one browse page (newest first)."""
    url = (f"{BASE}/handle/{community}/browse?type=dateissued"
           f"&sort_by=2&order=DESC&rpp={rpp}&offset={offset}")
    page = fetch(url, delay).decode("utf-8", errors="ignore")
    handles = []
    for block in page.split('class="ds-artifact-item')[1:]:
        m = re.search(r'href="/handle/(123456789/\d+)"', block)
        if m and m.group(1) not in handles:
            handles.append(m.group(1))
    return handles


def parse_item(handle: str, delay: float) -> dict | None:
    """Fetch an item's full metadata page and return a corpus record."""
    page = fetch(f"{BASE}/handle/{handle}?show=full", delay).decode("utf-8", errors="ignore")

    fields: dict[str, list[str]] = {}
    for row in re.findall(r'<tr class="ds-table-row[^"]*">(.*?)</tr>', page, re.S):
        cells = [html.unescape(re.sub(r"<[^>]+>", "", c)).strip()
                 for c in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
        if len(cells) >= 2 and cells[0].startswith("dc."):
            fields.setdefault(cells[0], []).append(cells[1])

    if "dc.title" not in fields:
        return None

    pdfs = re.findall(r'href="(/bitstream/handle/[^"]+?\.pdf)[^"]*"', page)
    return {
        "id": handle.split("/")[-1],
        "handle": handle,
        "title": fields["dc.title"][0],
        "authors": fields.get("dc.contributor.author", []),
        "supervisor": fields.get("dc.contributor.advisor", []),
        "date_issued": fields.get("dc.date.issued", [""])[0],
        "type": fields.get("dc.type", [""])[0],
        "language": fields.get("dc.language.iso", [""])[0],
        "subjects": fields.get("dc.subject", []),
        "abstract": fields.get("dc.description.abstract", [""])[0],
        "url": f"{BASE}/handle/{handle}",
        "pdf_url": f"{BASE}{html.unescape(pdfs[0])}" if pdfs else None,
        "pdf_file": None,
    }


def load_existing() -> set[str]:
    if not META_FILE.exists():
        return set()
    with META_FILE.open(encoding="utf-8") as f:
        return {json.loads(line)["handle"] for line in f if line.strip()}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dept", choices=DEPARTMENTS, default="swe")
    ap.add_argument("--limit", type=int, default=50, help="max new items this run")
    ap.add_argument("--delay", type=float, default=3.0, help="seconds between requests (min 2)")
    ap.add_argument("--no-pdf", action="store_true", help="metadata + abstract only")
    args = ap.parse_args()
    delay = max(args.delay, 2.0)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    META_FILE.parent.mkdir(parents=True, exist_ok=True)
    seen = load_existing()
    community = DEPARTMENTS[args.dept]
    added, offset, rpp = 0, 0, 20

    print(f"Harvesting up to {args.limit} new items from {args.dept.upper()} ({len(seen)} already in corpus)")
    while added < args.limit:
        handles = browse_item_handles(community, offset, rpp, delay)
        if not handles:
            break
        for handle in handles:
            if added >= args.limit:
                break
            if handle in seen:
                continue
            try:
                rec = parse_item(handle, delay)
                if rec is None:
                    continue
                if rec["pdf_url"] and not args.no_pdf:
                    pdf_path = RAW_DIR / f"{rec['id']}.pdf"
                    if not pdf_path.exists():
                        pdf_path.write_bytes(fetch(rec["pdf_url"], delay))
                    rec["pdf_file"] = str(pdf_path.relative_to(REPO_ROOT)).replace("\\", "/")
                with META_FILE.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                seen.add(handle)
                added += 1
                print(f"[{added}/{args.limit}] {rec['id']}: {rec['title'][:70]}")
            except Exception as exc:  # keep going if one item fails
                print(f"  ! skipped {handle}: {exc}")
        offset += rpp

    print(f"Done. Added {added} items -> {META_FILE.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
