# Changelog

What changed in Parallax, newest first. Dates are when the work was committed; the git history has the detail.

## 2026-11-23

- **Reviewed reports can't be deleted.** Once a reviewer records a decision, the student no longer sees Delete
  and the API refuses it, so a "Needs follow-up" report stays on record. Resetting the decision to "Awaiting
  review" allows deleting again.
- **No lost analyses in a long queue.** The AI service used to forget a PDF job that waited in the queue for
  more than an hour; waiting and running jobs are now always kept, and a result is kept for an hour after it
  finishes.
- **Sign-in errors stay visible.** A wrong password is shown inside the form, read out by screen readers, and
  cleared when you edit a field, instead of a toast that disappears.
- **The waiting-game prompt starts on "No thanks"**, so pressing Enter never starts a game by accident.

## 2026-11-22

- **PDF file names keep Bangla titles.** A Bangla report used to download as `Parallax-Report_report_<date>.pdf`;
  it now keeps its title, with an ASCII fallback for older browsers.
- **Clearer queue wording.** While an analysis waits for the AI service, the page says how many reports are
  ahead of it instead of showing a misleading place number.
- **Keyboard shortcuts** in the waiting game (the keyboard button or `?`).
- **Department picker** on sign-up and the Google sign-up step uses the same dropdown as the dashboard.
- **Homepage copy** now matches the product: two review decisions, what admins can do, and that source
  authors are never shown.
- **Tooling:** a script to delete test accounts (`scripts/delete_user.py`), tests for the local AI stand-in
  and the job queue position, and a [deployment guide](docs/deployment.md).

## 2026-11-20

- **PDF report:** the DIU logo on the cover, and long source titles no longer overlap the line below.
- **Print** prints the same PDF that Download saves.
- **Play while you wait:** an optional game during the 2–3 minute PDF analysis (Parallax Pairs and Same
  Meaning?), which never touches the analysis.
- **Dashboard polish:** styled dropdowns, and the homepage's sun/moon theme switch in the dashboard.
- **Tooling:** a local AI-service stand-in for trying PDF uploads, and a script that builds the class demo
  report.

## 2026-11-18

- **Dashboard redesign:** an app shell with sidebar, an overview, a report page built around the evidence,
  My reports, the review queue, administration and Settings.
- **Downloadable PDF report** with Bangla shaping, findings, top sources with evidence, the reviewer's
  decision and a verification QR code. Corpus authors are never printed.
- **Account settings:** edit name and department, change password (signs other browsers out), see and end
  sessions.

## 2026-11-16

- Review queue, report pages, administration page and dashboard shortcuts in the web app.
- Corpus metadata for 1,925 reports, a script to set roles, the planted-reuse evaluation results and the
  demo guide.

## 2026-11-14

- Admin endpoints for people, roles and stats.
- The AI service requires a backend key or a signed upload ticket and signs every result.
- PDF analyses run as background jobs that the browser polls; deploy scripts for Azure.
- Planted-reuse evaluation and a labelling sheet for real report pairs.

## 2026-11-12

- Every analysis is saved as a report; reviewers record decisions.
- Direct PDF uploads to the AI service with short-lived tickets.
- All four perspectives shown in the report.

## 2026-11-10

- Corpus scaled to 1,925 reports: reports read from disk on demand, chunked and resumable index builds,
  float16 vectors, and repository duplicates left out.

## 2026-11-08

- **Concept similarity** (TF-IDF key terms) and **structural similarity** (aligned heading outlines), combined
  with lexical and semantic into a weighted hybrid score.

## 2026-11-07

- The analyze page, upload form, progress view and similarity report in the web app.
- Protected analysis endpoints in the backend.

## 2026-11-06

- **Backend:** FastAPI with SQLAlchemy and Alembic, Argon2id passwords, session cookies, a failed-sign-in
  limiter, and Google sign-in. Deployed on Vercel.
- **AI service:** PDF extraction into sections, template filtering, passage splitting, a FAISS index, lexical
  shingles and LaBSE semantic similarity for Bangla-English reuse.
- **Frontend:** sign-in and sign-up pages, the first dashboard, SEO metadata, and the sun/moon theme switch.

## 2026-11-05

- The landing page: hero, perspectives, explainability demo, roles, research, responsible use and FAQ.
- Text preprocessing, lexical similarity and evaluation metrics; the DIU DSpace harvester.

## 2026-10-14

- Monorepo setup: Docker, CI and the first Next.js frontend.
