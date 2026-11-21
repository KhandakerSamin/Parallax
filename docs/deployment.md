# Deployment

How the live site is put together and how to update it. Live at https://parallax-diu.vercel.app.

## What runs where

| Part | Host | Talks to |
|---|---|---|
| Website (Next.js) | Vercel project for the frontend | The API, through the `/api/v1/*` rewrite (`BACKEND_URL`) |
| API (FastAPI) | Vercel project `parallax-diu-api` | The database; issues upload tickets for the AI service |
| Database (PostgreSQL) | Neon | Only the API |
| AI service (FastAPI, LaBSE, FAISS) | Azure App Service, Linux B2 (2 CPUs, 3.5 GB) | Called by the browser directly with a signed ticket |

The browser uploads PDFs straight to the AI service, because Vercel functions reject large request bodies.
The AI service signs each result, and the API saves a report only when that signature checks out.

## Settings

| Where | Setting | Purpose |
|---|---|---|
| API | `APP_ENV=production` | Secure cookies; refuses to start with the development `SECRET_KEY` |
| API | `SECRET_KEY` | Signs sessions; a long random value |
| API | `DATABASE_URL` | The Neon connection string |
| API | `PUBLIC_URL` | The website's address, used in links and the PDF's QR code |
| API | `AI_SERVICE_URL`, `AI_PUBLIC_URL` | The AI service's address (server side, and as the browser sees it) |
| API and AI service | `AI_SHARED_SECRET` | Signs upload tickets and results. **Must be the same in both** |
| API | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in |
| Website | `BACKEND_URL` | Where `/api/v1/*` is forwarded |
| AI service | `AI_ALLOWED_ORIGINS` | Comma-separated origins that may upload (the live website) |

Secrets live only in the hosts' settings and in git-ignored local files. Never commit them or paste them
into an issue or a chat.

## Updating the site

Order matters: the database first, then the API, then the website.

1. **Database.** If the change adds an Alembic migration, run it against Neon *before* the new API goes live:
   `alembic upgrade head` with `DATABASE_URL` pointing at Neon. An API that expects a column the database
   does not have yet fails on every request.
2. **API.** From `backend/`: `vercel deploy --prod`, then promote that deployment. Check it with
   `GET /api/v1/reports` without signing in: it must answer **401** (the API is up and guarding reports).
3. **Website.** From `frontend/`: `vercel deploy --prod`. Open the site and sign in.

The team's `finish-deploy.ps1` runs these steps in order (settings, migration, API with its check, website)
and stops at the first failure. A full run takes about two to three minutes, most of it Vercel installing
packages and building.

## The AI service

`python scripts/deploy_azure.py` (in `ai-service/`, with the Azure CLI signed in) zips the app and the corpus
index, creates the App Service on the first run and deploys. After a deploy, the first request downloads the
LaBSE model into persistent storage, so the first analysis can take a few minutes; later restarts reuse it.

Before a class or demo, open `https://<ai-service>/health` about five minutes early: a service that has been
idle needs a minute to load the model, and the health check starts that.

## After deploying

- Sign in, analyze a short pasted text (about 20 seconds) and open the report.
- Download its PDF.
- To make someone an admin: `python -m scripts.set_role --email <email> --role super_admin` with the
  production `DATABASE_URL`.
- To remove a test account: `python -m scripts.delete_user --id <ID>` (shows what it would delete), then
  again with `--yes`.
