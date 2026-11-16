# Evaluation

How well does Parallax find reuse? Two tests answer that from different sides:

1. **Planted reuse** (done): text is copied into a report on purpose, so the right answer is known.
2. **Human-labelled pairs** (in progress): real report pairs from the corpus, labelled by people.

Both run against the full corpus of 1,925 DIU reports (209,386 passages).

## 1. Planted reuse

`ai-service/scripts/evaluate_planted.py`. Raw results: `data/eval/planted.json`.

Each trial takes a corpus report (the *base*), pastes a block of text from a different corpus report (the
*source*) into it as a new "Literature Review" section, and analyses the result as a new submission. The
base itself is in the corpus, matches completely and is ignored; the question is whether the planted source
is found. Base and source are drawn at random from the 1,789 reports with at least 2,500 words (seed 331).

| Condition | What was planted |
|---|---|
| **Verbatim** | a run of whole sentences, pasted as is |
| **Edited** | the same, but every 6th word dropped and neighbouring sentences swapped: a cheap disguise that breaks word matching |
| **Nothing planted** | the base alone; the drawn source must *not* be reported |

The share is the planted words as a part of the whole submission: 5%, 10%, 20% or 40%.
15 trials per condition, 135 in total.

### Results

| Condition | Found | Ranked 1st | True share | Estimated | Lexical | Semantic |
|---|---|---|---|---|---|---|
| Verbatim 5% | **100%** | 80% | 6.0% | 5.5% | 5.2% | 5.0% |
| Verbatim 10% | **100%** | 87% | 10.3% | 9.7% | 9.7% | 7.8% |
| Verbatim 20% | **100%** | 87% | 20.1% | 19.3% | 19.3% | 15.8% |
| Verbatim 40% | **100%** | 93% | 37.7% | 35.6% | 35.6% | 25.7% |
| Edited 5% | 53% | 27% | 4.3% | 1.8% | 0.0% | 1.8% |
| Edited 10% | 80% | 73% | 8.6% | 4.2% | 0.1% | 4.2% |
| Edited 20% | **100%** | 73% | 17.4% | 9.4% | 0.1% | 9.4% |
| Edited 40% | **100%** | 100% | 33.9% | 19.2% | 0.5% | 19.2% |
| Nothing planted | **0 false alarms in 15** | | | | | |

*Found*: the source is among the reported matches. *Ranked 1st*: it is the top source apart from the base.
*Estimated*: the source's overall score, which is meant to be the share of the submission taken from it.

### What it shows

- **Copy-paste is always found, and its size is measured accurately.** All 60 verbatim plants were found, and
  the estimated share is within about 2 points of the true share (for example 19.3% for 20.1%).
- **"Not ranked first" was never a miss.** In all 8 verbatim trials where the planted source came second, the
  source above it was a report the base *already* resembled more strongly, before anything was planted (for
  example, one base already shares 65% with another report). Parallax ranked the real, larger overlap first,
  which is the right order.
- **Disguised copies defeat word matching but not meaning.** Dropping every 6th word and swapping sentences
  takes the lexical score to almost 0% in every edited condition. The semantic perspective still finds 100% of
  edited plants at 20% and 40%, and 80% at 10%. This is the case a word-matching checker misses, and the main
  reason Parallax has more than one perspective.
- **Disguised copies are under-measured.** For edited text the estimate is about half the true share (9.4% for
  17.4%). The semantic rule only counts a passage when it clearly stands out from the background, and a heavily
  cut passage often does not. A reviewer should read "about 10%" on an edited match as "at least 10%".
- **Small disguised copies are the hard case.** At 5% (one or two paragraphs, heavily edited), half are found.
- **No false alarms.** With nothing planted, the drawn source never appeared in 15 trials.

### Limits of this test

- Planting is artificial: real students reword by hand, translate, and mix several sources. The edited
  condition is a crude stand-in for rewording.
- Bangla-English translation is not planted here, because that needs a translator; it is covered by the
  hand-labelled translation pairs used to choose the model (see [similarity-engine.md](similarity-engine.md)),
  and the demo shows a full Bangla paragraph found at 100% semantic with 0% lexical.
- 15 trials per condition gives a rough picture (one trial is about 7 points), not a precise rate.

## 2. Human-labelled pairs

`ai-service/scripts/evaluate_labels.py`. Sheet: `data/eval/label-pairs.csv`.

40 real pairs from the corpus scan, spread over high (15), moderate (15) and low (10) scores and shuffled.
Each row links both reports on DSpace. A labeller opens them and writes one label, before looking at the
scores:

- **reuse**: text copied or closely reworded from one into the other
- **topic**: same subject or project idea, written independently
- **unrelated**: nothing meaningful in common

Then `python scripts/evaluate_labels.py score` reports, for the overall score and each perspective, the
precision and recall of flagging at the moderate level (0.15), and the best threshold on these labels.
Results will be added here once the sheet is labelled.

## Reproducing

```bash
cd ai-service
python scripts/evaluate_planted.py --pairs 15     # about 30 minutes on a laptop CPU
python scripts/evaluate_labels.py sheet           # only once; it refuses to overwrite labels
python scripts/evaluate_labels.py score
```
