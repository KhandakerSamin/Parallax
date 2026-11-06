# Corpus pipeline

How Parallax builds its reference corpus of DIU reports. Everything here runs from `ai-service/`.

```
DIU DSpace ──harvest_dspace.py──▶ data/raw/<id>.pdf + data/metadata/corpus.jsonl
           ──extract_corpus.py──▶ data/processed/<id>.json + data/metadata/extraction_summary.json
           ──build_index.py────▶ data/embeddings/ (FAISS passage index)
```

Step 3, the index, and how reports are compared are covered in [similarity-engine.md](similarity-engine.md).

## 1. Harvest

```bash
venv/Scripts/python scripts/harvest_dspace.py --dept swe --limit 250
```

The harvester browses a department's community on dspace.daffodilvarsity.edu.bd, newest first. For each item it saves the full metadata record (title, authors, supervisor, date, type, subjects, abstract) and the PDF.

It is polite by design:
- it waits 3 seconds between requests
- it only uses paths that robots.txt allows
- it identifies itself
- it skips items it already has

PDFs are git-ignored; the metadata is committed.

## 2. Extract

```bash
venv/Scripts/python scripts/extract_corpus.py          # new or changed PDFs only
venv/Scripts/python scripts/extract_corpus.py --force  # everything
```

Each PDF becomes a structured JSON document with:
- the abstract
- typed sections (title, kind, chapter kind, level, number, text)
- reference entries
- language, chapter outline, stats and quality flags
- the DSpace metadata

The code lives in `app/extraction/`:

| Module | Job |
|---|---|
| `pdf_reader.py` | Lines with font size and boldness. Drops running headers and footers, page numbers, symbol-font glyphs and zero-width characters. |
| `sections.py` | Skips template pages, finds the abstract, chapters, subsections and references, and classifies each section. |
| `document.py` | Builds the clean `ExtractedDocument` with stats and quality flags. |
| `boilerplate.py` | Finds and removes sentences shared by a large share of the corpus. |

## Why so much cleaning

DIU reports follow a shared template, so if you compare raw PDF text, every report looks partly similar to every other one. Before anything is compared, the extractor removes:
- **Running lines**, such as the "©Daffodil International University" footer on every page.
- **Template pages**: cover, declarations, approval, acknowledgement, dedication, table of contents, and lists of figures, tables and abbreviations.
- **Appended plagiarism-checker reports.** Some students attach a Turnitin originality report. It quotes other people's text, so it must never count as the student's own.
- **Appendices** are kept but left out of `body_text`, because they are mostly code listings and forms.
- **Corpus-wide boilerplate**: any sentence found in at least 8% of reports.

The boilerplate threshold is deliberately high. Below it, sentences shared by only a few reports are exactly what Parallax should **surface** as potential similarity, not hide. On the SWE corpus, a small group of reports on a related topic share dozens of identical sentences. A lower threshold would have deleted that evidence.

## Section kinds

Every section gets one of:
- `introduction`
- `background`
- `requirements`
- `methodology`
- `results`
- `conclusion`
- `references`
- `appendix`
- `other`

Subsections also record their **chapter kind**: a "2.1 Introduction" inside the Methodology chapter is still methodology. A report's `outline`, the list of its chapter kinds in order, is the starting point for structural similarity.

## Quality flags

| Flag | Meaning |
|---|---|
| `little_text` | Under 500 words of body text. The PDF is probably scanned and needs OCR. |
| `legacy_bangla_font` | The Bangla was typed in a non-Unicode font (e.g. SutonnyMJ), so it extracts as garbled Latin text. |
| `no_structure` | No chapter headings were found, so the body is kept as a single section. |
| `no_abstract`, `no_references` | The report has none, or they could not be located. |

See `data/metadata/extraction_summary.json` for the current corpus numbers.
