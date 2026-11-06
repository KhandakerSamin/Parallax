<div align="center">

<img src="frontend/app/icon.svg" alt="Parallax logo" width="72" height="72" />

# Parallax

**Multi-perspective similarity detection for Bangla-English academic reports**

Find *potential similarity* in student reports from more than one angle:
copied wording, reworded or translated text, shared concepts and copied structure.
Every result comes with the evidence, so a reviewer makes the decision.

[![CI](https://github.com/KhandakerSamin/Parallax/actions/workflows/ci.yml/badge.svg)](https://github.com/KhandakerSamin/Parallax/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)
![LaBSE](https://img.shields.io/badge/Model-LaBSE-FFD21E?logo=huggingface&logoColor=black)
![FAISS](https://img.shields.io/badge/Vector%20search-FAISS-0467DF)

[Live site](https://parallax-diu.vercel.app) ·
[Similarity engine](docs/similarity-engine.md) ·
[Corpus pipeline](docs/corpus-pipeline.md) ·
[Backend](backend/README.md) ·
[Frontend](frontend/README.md)

</div>

---

## Contents

- [Why Parallax](#why-parallax)
- [Features](#features)
- [How it works](#how-it-works)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Results so far](#results-so-far)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [API overview](#api-overview)
- [Testing and quality](#testing-and-quality)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Team](#team)

## Why Parallax

Most similarity checkers match **wording**. They miss reuse that has been:

- **paraphrased:** the same ideas in new words
- **translated:** an English source rewritten in Bangla, or the other way round
- **mixed:** Bangla and English in the same report, which is common at Bangladeshi universities

Parallax compares a report against a corpus of past **Daffodil International University (DIU)** reports from several perspectives at once. It shows which passages match and why.

> **Responsible use.** Parallax reports *potential similarity*. A score is never a verdict on its own: a human reviewer examines the evidence and makes the call.

## Features

| Area | What it does | Status |
|---|---|---|
| **Lexical similarity** | Finds reused wording with 5-word shingles, sentence by sentence | ✅ Done |
| **Semantic similarity** | Finds reworded *and translated* passages with multilingual LaBSE embeddings and FAISS search | ✅ Done |
| **Evidence** | Shows each submitted passage beside its source passage, with section names | ✅ Done (API) |
| **Template filtering** | Ignores the shared DIU template, cover pages and boilerplate so they don't inflate scores | ✅ Done |
| **Accounts** | Email/password and Google sign-in, with roles: student, reviewer, researcher and admin | ✅ Done |
| **Profiles** | Google profile photo, Student ID or Staff ID, and department in the navbar and dashboard | ✅ Done |
| **Concept similarity** | Compares the key ideas and terms of two reports | 🚧 Planned |
| **Structural similarity** | Compares chapter and section organisation | 🚧 Planned |
| **Upload and report pages** | Upload a PDF in the web app and read the report there | 🚧 In progress |
| **Reviewer workflow** | Reviewer decisions, saved reports, admin tools | 🚧 Planned |

## How it works

```
 PDF report
    │
    ▼
 1. Extract ──── PyMuPDF reads text with font size and weight
    │            → detects abstract, chapters, sections, references
    │            → strips headers/footers, cover, declaration, TOC, Turnitin pages
    ▼
 2. Clean ────── removes sentences found in ≥ 8% of reports (shared template text)
    │
    ▼
 3. Passages ─── ~70-word windows of whole sentences, never crossing a section
    │
    ├──────────────────────────────┐
    ▼                              ▼
 4a. Lexical                    4b. Semantic
     5-word shingles                LaBSE → 768-d vectors
     ≥ 50% shared with one          FAISS nearest-neighbour search
     source sentence = reuse        "standout" rule filters template matches
    │                              │
    └──────────────┬───────────────┘
                   ▼
 5. Report ───── overall = max(lexical, semantic) · level low / moderate / high
                 up to 10 sources, each with side-by-side evidence
```

**The "standout" rule.** All software engineering reports contain similar use-case tables, test tables and textbook definitions, so a plain similarity threshold raises false alarms. A passage counts as a close paraphrase only when:

- it is **near-identical** (cosine ≥ 0.95), or
- it reaches cosine **≥ 0.75** *and* stands at least **0.15 above its background**. The background is its average similarity to the 4th–8th best other reports.

Template text resembles many reports equally, so it never stands out. Real reuse matches one source far above the rest. The method is explained in [docs/similarity-engine.md](docs/similarity-engine.md).

**Why the overall score is the maximum.** A translated report shares almost no wording (lexical ≈ 0) but is fully reused (semantic ≈ 1). Averaging the two would hide exactly the case Parallax exists to catch.

## Architecture

```
┌──────────────────┐   /api/v1/*   ┌──────────────────┐      ┌───────────────────┐
│     Frontend     │ ────────────▶ │     Backend      │ ───▶ │    PostgreSQL     │
│ Next.js · React  │   (proxied,   │ FastAPI · SQLA.  │      │  (Neon / SQLite)  │
│  Tailwind · TS   │  same origin) │ accounts, auth   │      └───────────────────┘
└──────────────────┘               └──────────────────┘
         │
         │  analyze a report
         ▼
┌──────────────────┐      ┌──────────────────────────────────────────┐
│    AI service    │ ───▶ │ FAISS index · LaBSE model · corpus JSON  │
│ FastAPI · PyTorch│      │ 307 reports · 32,857 passages            │
└──────────────────┘      └──────────────────────────────────────────┘
```

- **Frontend** and **backend** are separate deployments. Next.js forwards `/api/v1/*` to the backend, so the browser sees a single site and the httpOnly session cookie works without CORS.
- The **AI service** is kept separate because the ML stack (PyTorch, the LaBSE model and the FAISS index) is several hundred MB and CPU-heavy. It must not slow down sign-in or page loads.

## Tech stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI, Framer Motion, React Hook Form + Zod, Lenis |
| **Backend** | FastAPI, SQLAlchemy 2, Alembic, Pydantic, Argon2id (argon2-cffi), PostgreSQL / SQLite |
| **Auth** | Opaque server sessions in httpOnly cookies, Google OAuth 2.0 with PKCE, login rate limiting |
| **AI service** | PyMuPDF, sentence-transformers (LaBSE), FAISS, NumPy, FastAPI |
| **Tooling** | pytest, Ruff, ESLint, Prettier, GitHub Actions, Docker Compose |
| **Hosting** | Vercel (frontend and API), Neon PostgreSQL |

### Security highlights

- Passwords are hashed with **Argon2id** and never stored in plain text.
- Session tokens are random and opaque; only their **SHA-256 hash** is stored, so a leaked database cannot be used to sign in.
- Cookies are **httpOnly**, **SameSite=Lax** and **Secure** in production.
- Login is limited to 5 failed attempts per 15 minutes per account.
- Google sign-in uses the authorization-code flow with **PKCE** and an **HMAC-signed state** cookie. The ID token's issuer, audience, expiry and verified email are all checked.
- Production refuses to start with the development secret key.

## Results so far

Corpus: **307** Software Engineering reports from DIU's public DSpace repository (2024–2025), about **2.2 million words**, giving **32,857** passages.

**Model choice.** Four multilingual models were scored on hand-labelled passage pairs. The margin is the lowest "reuse" score minus the highest "different" score; higher is better.

| Model | Bangla translation | English paraphrase | Worst "different" | Margin |
|---|---|---|---|---|
| paraphrase-multilingual-MiniLM-L12-v2 | 0.41 | 0.86 | 0.75 | −0.35 |
| multilingual-e5-small | 0.90 | 0.96 | 0.89 | +0.01 |
| multilingual-e5-base | 0.91 | 0.96 | 0.90 | +0.02 |
| **LaBSE** (chosen) | 0.86 | 0.87 | 0.56 | **+0.30** |

**Calibration.** Every report was compared with all the others (leave-one-out):

| Rule | Median top semantic | 90th percentile | Reports rated moderate or high |
|---|---|---|---|
| cosine ≥ 0.75 | 8.1% | 29.3% | 34 |
| cosine ≥ 0.85 | 0.0% | 8.5% | 8 |
| **floor 0.75 + standout 0.15** | **0.0%** | **5.3%** | **13** |

**What the scan found:**

- A Bangla translation of a corpus passage correctly finds its English source.
- Two internship reports score **69% semantic but only 3% lexical**: heavily reworded text that a wording-only checker misses.
- Duplicate repository uploads (the same report deposited twice) show up at 99%.

## Getting started

### Prerequisites

- **Node.js** 20.9 or newer
- **Python** 3.10 or newer (CI uses 3.11)
- **Git**. Docker is optional.

### 1. Clone and configure

```bash
git clone https://github.com/KhandakerSamin/Parallax.git
cd Parallax
cp .env.example .env              # used by Docker Compose
```

### 2. Backend (accounts and sign-in), port 8000

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate             # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head               # create or upgrade the tables (run again after pulling new migrations)
python -m scripts.seed_demo_users  # demo accounts
uvicorn app.main:app --reload --port 8000
```

For Google sign-in, put `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `PUBLIC_URL=http://localhost:3000` in `backend/.env`. That file is git-ignored; never commit it.

### 3. Frontend (web app), port 3000

```bash
cd frontend
npm install
npm run dev                        # http://localhost:3000
```

Sign-in needs the backend running. For an offline demo without it, set `NEXT_PUBLIC_USE_MOCK_AUTH=true` in `frontend/.env.local`.

**Demo accounts:**

| Account | Email / ID | Password |
|---|---|---|
| Student | `student@diu.edu.bd` / `221-35-001` | `Parallax#2026` |
| Reviewer | `reviewer@diu.edu.bd` / `STAFF-0042` | `Parallax#2026` |

### 4. AI service (similarity engine), port 8001

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

python scripts/harvest_dspace.py   # download reports from DIU DSpace (polite: 3 s between requests)
python scripts/extract_corpus.py   # PDFs → structured JSON in data/processed/
python scripts/build_index.py      # passages → FAISS index in data/embeddings/ (~50 min on a laptop CPU)

uvicorn app.main:app --port 8001   # http://localhost:8001/docs
```

The corpus, extracted text and index live in `data/` and are **not committed**, because they are large and regenerated by the scripts above.

> **Windows note:** if PyTorch fails to load with `WinError 1114` (c10.dll), either update the Microsoft Visual C++ Redistributable or install `torch<2.6`.

### Docker (alternative)

```bash
docker compose up --build
```

This starts PostgreSQL, Redis, the backend (8000), the AI service (8001) and the frontend (3000).

## Project structure

```
Parallax/
├── frontend/                 Next.js web app
│   ├── app/                  routes: landing, (auth) sign-in/up, dashboard
│   ├── components/           landing, auth, dashboard, layout, ui (Radix-based)
│   └── lib/                  auth client, validation, content
├── backend/                  FastAPI accounts and auth API
│   ├── app/                  api/routes, core (security, cookies, rate limit), models, schemas, services
│   ├── migrations/           Alembic database migrations
│   ├── scripts/              seed demo users, create admin users
│   └── tests/                pytest suite
├── ai-service/               FastAPI similarity engine
│   ├── app/
│   │   ├── extraction/       PDF reading, section detection, cleaning
│   │   ├── embeddings/       encoder (LaBSE), passages, FAISS index
│   │   ├── similarity/       lexical shingle matching
│   │   ├── pipelines/        analyze: semantic + lexical → matches and evidence
│   │   ├── services/         corpus and engine loading
│   │   └── api/              /health, /analyze, /analyze/text
│   ├── scripts/              harvest, extract, build index, compare models, scan corpus
│   └── tests/                pytest suite
├── data/                     corpus, processed text, embeddings (git-ignored)
├── docs/                     corpus-pipeline.md, similarity-engine.md
├── .github/workflows/ci.yml  lint, tests, migration check, build
└── docker-compose.yml
```

## API overview

**Backend:** `http://localhost:8000/api/v1`, with interactive docs at `/api/v1/docs`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create an account (DIU email, ID, role, department) |
| POST | `/auth/login` | Sign in with email or university ID |
| POST | `/auth/logout` | End the session |
| GET | `/auth/me` | The signed-in user, or `null` |
| GET | `/auth/google` | Start Google sign-in |
| GET | `/auth/google/callback` | Google redirects here |
| POST | `/auth/google/complete` | Finish a first-time Google sign-up |

**AI service:** `http://localhost:8001`, with interactive docs at `/docs`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Status and corpus size |
| POST | `/analyze` | Analyze an uploaded PDF (≤ 25 MB) |
| POST | `/analyze/text` | Analyze pasted text |

The full response format is in [docs/similarity-engine.md](docs/similarity-engine.md#api).

## Testing and quality

```bash
cd backend    && pytest -q && ruff check .
cd ai-service && pytest -q && ruff check .
cd frontend   && npm run lint && npm run typecheck && npm run build
```

| Suite | Tests |
|---|---|
| Backend (auth, sessions, Google sign-in) | 56 |
| AI service (extraction, passages, lexical, analyzer, API) | 161 |

**GitHub Actions** runs on every push and pull request:
- Ruff and pytest for the backend and the AI service
- a check that the Alembic migrations match the models
- a lint and build of the frontend
- validation of `docker-compose.yml`

## Deployment

| Part | Where | Notes |
|---|---|---|
| Frontend | Vercel: [parallax-diu.vercel.app](https://parallax-diu.vercel.app) | `BACKEND_URL` points to the API project |
| Backend API | Vercel (FastAPI) | `APP_ENV=production`, `SECRET_KEY`, `PUBLIC_URL`, `GOOGLE_*` |
| Database | Neon PostgreSQL | Run `alembic upgrade head` against it **before** deploying a backend that needs a new migration |
| AI service | Not hosted yet | Too large for Vercel; planned for a CPU host such as Render or Hugging Face Spaces |

## Roadmap

- [x] Landing page, theme toggle, responsive navigation
- [x] Accounts: email/password, Google sign-in, roles, sessions
- [x] Corpus of 307 DIU SWE reports with structured extraction
- [x] Lexical and semantic similarity with evidence, and the analysis API
- [ ] Upload and report pages in the web app
- [ ] Concept and structural perspectives, and a hybrid score
- [ ] Saved reports, reviewer decisions, admin tools
- [ ] Host the AI service
- [ ] Human-labelled evaluation set, and a larger corpus across departments

## Team

Capstone project for **SE 331**, Department of Software Engineering, **Daffodil International University**.

| Member | GitHub | Focus |
|---|---|---|
| **Khandaker Samin Yeasar** | [@KhandakerSamin](https://github.com/KhandakerSamin) | Backend, authentication, AI pipeline |
| **Nusrat Jahan** | [@nusratjahan335](https://github.com/nusratjahan335) | Frontend, UI/UX, integration |

**Branches:** each member works on their own branch (`Samin`, `Nusrat`) and merges into `main` through pull requests.

---

<div align="center">
<sub>Parallax reports <b>potential similarity</b> for human review. It does not make plagiarism decisions.</sub>
</div>
