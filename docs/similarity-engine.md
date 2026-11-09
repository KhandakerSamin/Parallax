# Similarity engine

How the AI service compares a report with the corpus, from four perspectives:
- **lexical**: reused wording
- **semantic**: reworded or translated text
- **concept**: the same key ideas and technical terms
- **structural**: the same heading outline, in the same order

Every score is **potential similarity** for a reviewer to examine. A score is never a verdict on its own.

Everything here runs from `ai-service/`.

## Building the index

```bash
venv/Scripts/python scripts/extract_corpus.py   # PDFs → data/processed/ (see corpus-pipeline.md)
venv/Scripts/python scripts/build_index.py      # passages → data/embeddings/ (about 6 h per 1,000 reports on a laptop CPU)
venv/Scripts/python scripts/find_duplicates.py  # leave out reports the repository holds twice
```

The build saves its progress in chunks of 6,400 passages (`data/embeddings-partial/`). After a power cut, running it again continues from the last finished chunk.

**Passages.** Each report is split into passages of about 70 words. A passage is made of whole sentences and never crosses a section boundary, so every match can say which section it came from. The abstract and the chapters are compared. Appendices (code listings, forms) and references are not.

The corpus gives **209,386 passages from 1,925 reports**: about 1,030 Software Engineering and 1,000 Computer Science and Engineering reports from DIU's DSpace, minus the copies below. (The first version used 307 SWE reports and 32,857 passages.)

**Repository duplicates** (`app/extraction/duplicates.py`). DSpace holds 102 reports twice: re-uploads, or the same report filed under both departments. Left in, each copy would be a ~100% "source" for the other. A report counts as a copy when its text is identical to another's, or when its opening (words 200–1,200) is identical *and* the two share an author, which catches a lightly revised re-upload. The lowest id is kept. A shared opening by different authors is never treated as a copy, because that is exactly what Parallax should show. Copies are listed in `data/processed/_duplicates.json`; the corpus loader skips them and their passages are removed from the index.

**Index.** Each passage is embedded and stored in a FAISS inner-product index. Vectors are unit length, so the inner product is the cosine. They are stored as **float16**, which halves the index (675 MB → 338 MB) with practically identical results: on 400 test queries, 99.97% of the top-60 neighbours were unchanged and scores moved by at most 0.00004. Search is slower (about 5 s per 400 passages on 2 CPU cores), which is small next to encoding. The index lives in `data/embeddings/`, which is git-ignored:
- `index.faiss`
- `passages.jsonl`
- `manifest.json`, which records the model

The service always loads the encoder named in the manifest, so the query vectors and the index can never come from different models.

## Choosing the model

`scripts/compare_models.py` scores hand-labelled passage pairs from `data/eval/model_probe.json`:
- **reuse:** a Bangla translation of a corpus passage, and a real English paraphrase between two reports
- **different:** two reports on the same topic, an unrelated abstract, and a report's own introduction

The **margin** is the lowest reuse score minus the highest different score. A positive margin means one threshold can separate the two classes.

| Model | Bangla translation | English paraphrase | Worst "different" | Margin |
|---|---|---|---|---|
| paraphrase-multilingual-MiniLM-L12-v2 | 0.41 | 0.86 | 0.75 | −0.35 |
| multilingual-e5-small | 0.90 | 0.96 | 0.89 | +0.01 |
| multilingual-e5-base | 0.91 | 0.96 | 0.90 | +0.02 |
| **LaBSE** | 0.86 | 0.87 | 0.56 | **+0.30** |

We use **LaBSE**. It was trained on translation pairs, so a Bangla passage lands next to its English source, while two reports that merely share a topic do not.

MiniLM barely recognises the Bangla translation. The e5 models score almost everything high, including text that only shares a topic.

The cost is speed: about 12–16 passages per second on a laptop CPU, compared with about 45 for MiniLM.

The probe set is small, so it shows a direction rather than proving one. The evaluation set will test the choice at scale.

## Scoring a report

`app/pipelines/analyze.py`:

1. Split the submitted report into passages and embed them. For a report already in the corpus, the stored vectors are reused.
2. For each passage, fetch its 60 nearest corpus passages. Every report that appears is a **candidate source**.
3. **Semantic score** for a source: the share of the submitted report's words in passages that have a *close paraphrase* in that source (see the rule below).
4. **Lexical score** for the 25 strongest candidates: the share of words in sentences that reuse the source's wording. A sentence counts when at least half of its 5-word shingles appear in a single source sentence. Sentences under 8 words are ignored.
5. **Overall** = the larger of the two scores. It is not an average: a translated report shares no wording (lexical 0) yet is fully reused.
6. Report up to 10 sources scoring at least 2%. Each source comes with up to 12 evidence pairs: the submitted passage beside the source passage, with section titles.

The summary level is:
- **high:** overall ≥ 40%
- **moderate:** overall ≥ 15%
- **low:** below that

### The close-paraphrase rule

A plain cosine threshold does not work on SWE reports. Every report has use-case tables, test-case tables and metric definitions that look alike. Between 0.80 and 0.85, nearly all matches are this kind of template text.

So a passage pair counts as a close paraphrase when **either**:
- the cosine is **≥ 0.95** (near-identical; this holds even when several reports share the text), **or**
- the cosine is **≥ 0.75** and beats the passage's **background** by **≥ 0.15**.

The background is the mean similarity of the passage's 4th–8th best other reports. Template text has a crowded background and never stands out. Reworded or translated text has one source far above the rest.

The background starts at the 4th report, so a passage shared by up to three sources still stands out.

**Calibration** (`scripts/scan_corpus.py`) compares every report with all the others:

| Rule | Median top semantic | 90th pct | Moderate + high reports |
|---|---|---|---|
| cosine ≥ 0.75 | 8.1% | 29.3% | 34 |
| cosine ≥ 0.80 | 2.6% | 15.0% | 15 |
| cosine ≥ 0.85 | 0.0% | 8.5% | 8 |
| **floor 0.75 + standout 0.15** | **0.0%** | **5.3%** | **13** |

The standout rule is as quiet as a 0.85 threshold on ordinary reports. Unlike 0.85, it still catches:
- the Bangla translation (cosine 0.857, standout 0.22)
- the English paraphrase (0.865, standout 0.20)
- reworded passages in the 0.75–0.85 range

In a manual spot check:
- the passages it drops at 0.85 and above were template tables and textbook definitions
- the passages it adds below 0.85 were genuine rewordings

**Re-checked on 1,925 reports** (`scan_corpus.py --sample 400`, a random 400 reports against the whole corpus, same rule):

| Corpus | Median top semantic | 90th pct | Moderate + high |
|---|---|---|---|
| 307 SWE reports | 0.0% | 5.3% | 4% |
| 1,925 SWE + CSE reports | 0.0% | 26.7% | 16.5% (66 of 400) |

The rise is real reuse that a bigger corpus can see, not a looser rule. The strongest pairs are different students on the same project: "SWE Sports Reminder" and "SWE Sport Event Reminder" (92%), two "Buzz-Hub" e-commerce reports from different years (64%), and two Dhaka air-pollution theses at 71% semantic but 5% lexical (reworded). The lexical evidence is personal sentences reused word for word ("So, I used (5) months to make our system."), not template text. The thresholds are unchanged.

### What the scan found

These findings are about **potential** similarity in the public DSpace corpus:
- **Two reports deposited twice** (99%+), and **one PDF filed under two records** with different titles (byte-identical files). These are repository duplicates, not student reuse.
- **A pair of internship reports from the same company** at 69% semantic and only 3% lexical. That means the content is heavily reworded, which is what lexical-only checkers miss.
- **A group of three surgical-video theses** sharing 8–11% with each other, mostly the dataset description.

## Concept and structure

These two perspectives are computed for the same 25 candidate sources.

**Concept** (`app/similarity/concept.py`). Each report is summarised by its 40 strongest **key terms**: single words and two-word phrases, weighted by TF-IDF over the corpus. Terms used by more than 35% of reports ("system", "user", "data") are dropped, and so are terms found in only one report. The score is the cosine of the two key-term profiles, and the shared terms are shown as evidence.

Terms are compared as written, so a Bangla report and its English source share few terms. The semantic perspective covers translation.

**Structure** (`app/similarity/structural.py`). A report's outline is its sequence of chapter and section headings, without numbering. Two outlines are aligned in order with a weighted longest common subsequence. Headings count as equal when they share at least 60% of their words. Each heading is weighted by how rare it is in the corpus, so the DIU template (Introduction, Methodology, Conclusion) counts for little. The score is Dice-style: twice the shared weight over both outlines' total weight.

**Calibration**, from 400 random report pairs against known related pairs:

| | Random pairs: median / 90th pct / max | Related pairs |
|---|---|---|
| Concept | 0.00 / 0.00 / 0.19 | 0.24 (two ransomware reports) to 1.00 (duplicate deposit) |
| Structure | 0.02 / 0.10 / 0.70 | 0.30 (same-company internships) to 1.00 |

## Hybrid score

Each match also gets a **hybrid score**, a weighted blend of the four perspectives:

| Lexical | Semantic | Concept | Structural |
|---|---|---|---|
| 0.20 | 0.35 | 0.25 | 0.20 |

**Text reuse still decides the level.** `overall = max(lexical, semantic)` sets low, moderate or high, because only text reuse comes with passage-level evidence. Concept and structure add context and raise the hybrid score. They never list a source on their own: two students writing about ransomware, or following the DIU chapter plan, is normal.

## API

```bash
venv/Scripts/python -m uvicorn app.main:app --port 8001
```

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/health` | | `status` (`ok`, or `degraded` when there is no index) and corpus size |
| POST | `/analyze` | multipart `file` (PDF, ≤ 25 MB) | `AnalysisResult` |
| POST | `/analyze/text` | `{"text": "...", "title": "..."}` | `AnalysisResult` |

`AnalysisResult` has these fields:
- `document`: words, passages, language, extraction flags
- `summary`: overall, lexical and semantic coverage, level
- `matches[]`: source metadata, `overall`, `hybrid`, the four `scores`, evidence, `shared_terms` and `shared_headings`
- `weights`: the hybrid score's weights
- `corpus`: size and model
- `notes`

**Errors:**
- 413: the file is too large
- 415: the file is not a PDF
- 422: the PDF is unreadable, or the text is empty
- 503: no index has been built

**Settings** (environment variables):
- `PARALLAX_DATA_DIR` (default `<repo>/data`)
- `MAX_UPLOAD_MB` (default 25)
- `AI_ALLOWED_ORIGINS` (CORS, comma-separated)

**Speed on a laptop CPU:**
- the first request loads the model, about 10 s
- a short text takes under 1 s
- a full 40-page report takes about 25 s, mostly embedding its passages
