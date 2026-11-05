# Parallax — Backend

FastAPI service for accounts and sessions. Document workflows will be added here later. User data lives in a SQL database through SQLAlchemy: **PostgreSQL** in Docker and production, and a local **SQLite** file (`backend/parallax.db`) if you run it without Docker.

## Run it locally (no Docker)

Requires Python 3.10 or newer.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head              # create the tables
python -m scripts.seed_demo_users # demo accounts (see below)
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000/api/v1
- Interactive docs: http://localhost:8000/api/v1/docs

Then start the frontend (`cd frontend && npm run dev`). It forwards `/api/v1/*` to this server.

### Demo accounts

| Account  | Email / ID                           | Password        |
| -------- | ------------------------------------ | --------------- |
| Student  | `student@diu.edu.bd` / `221-35-001`  | `Parallax#2026` |
| Reviewer | `reviewer@diu.edu.bd` / `STAFF-0042` | `Parallax#2026` |

To create an admin or researcher (self sign-up only allows student and reviewer):

```bash
python -m scripts.create_user --name "Your Name" --email you@diu.edu.bd \
    --university-id 221-35-900 --role admin
```

## Run it with Docker

From the repo root, copy `.env.example` to `.env`, then run `docker compose up db backend`. The container runs `alembic upgrade head` before it starts.

To use a hosted PostgreSQL database (Neon, Supabase, Render…), set `DATABASE_URL=postgresql://user:password@host:5432/dbname`. `postgres://` URLs are accepted too.

## Settings

All settings are environment variables. They can also go in `backend/.env`.

| Variable                | Default                             | Purpose                                                        |
| ----------------------- | ----------------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`          | `sqlite:///./parallax.db`           | SQLAlchemy URL                                                 |
| `APP_ENV`               | `development`                       | `production` turns on Secure cookies and blocks the demo seed  |
| `ALLOWED_ORIGINS`       | `http://localhost:3000`             | CORS origins, comma-separated (only for direct browser calls)  |
| `ALLOWED_EMAIL_DOMAINS` | `diu.edu.bd,daffodilvarsity.edu.bd` | Domains allowed at sign-up; subdomains count                   |
| `AUTH_COOKIE_NAME`      | `parallax_session`                  | Must match the frontend's `AUTH_COOKIE_NAME`                   |
| `COOKIE_SECURE`         | on unless `development`             | Force the cookie's Secure flag                                 |
| `SESSION_TTL_HOURS`     | `12`                                | Session length without "remember me"                           |
| `REMEMBER_ME_DAYS`      | `30`                                | Session length with "remember me"                              |
| `LOGIN_MAX_ATTEMPTS`    | `5`                                 | Failed sign-ins allowed per identifier…                        |
| `LOGIN_WINDOW_MINUTES`  | `15`                                | …within this window, before it is locked for the rest of it    |

## How auth works

- **Passwords** are hashed with Argon2id. Plain-text passwords are never stored or logged.
- **Sessions are stored on the server.** Sign-in creates a row in `auth_sessions` and sends a random 256-bit token in an `HttpOnly; SameSite=Lax` cookie. Only the token's SHA-256 hash is stored, so a database leak doesn't expose live sessions. Signing out deletes the row, so the old cookie stops working at once.
- **Same-origin setup.** The browser only talks to the Next.js site. `next.config.ts` rewrites `/api/v1/*` to `BACKEND_URL`, so the cookie belongs to the frontend's domain and `proxy.ts` can guard `/dashboard`.
- **Sign-in protection.**
  - An unknown account and a wrong password get the same 401 response and take the same time.
  - After 5 failures, the identifier is locked for 15 minutes (429 with `Retry-After`).
  - The limiter runs in memory; move it to Redis if you run more than one API instance.
- **Server-side validation** matches the sign-up form: university email domains, 4–20 character IDs, the password rules, self-registration only as student or reviewer, and a known department. Email and ID must each be unique (FR02).

### Endpoints

All bodies are JSON in camelCase. Errors are returned as `{ "message": string, "field"?: string }`.

| Method | Path                     | Result                                                                                       |
| ------ | ------------------------ | -------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/auth/register`  | `201 { user }` and signs in · `400` invalid input · `409` email or ID taken (`field`)        |
| POST   | `/api/v1/auth/login`     | `200 { user }` · `401` wrong credentials · `429` too many attempts                           |
| POST   | `/api/v1/auth/logout`    | `204`, revokes the session and clears the cookie                                             |
| GET    | `/api/v1/auth/me`        | `200 { user }`, or `200 { user: null }` when signed out                                      |
| GET    | `/api/v1/health`         | `200 { status: "ok" }`                                                                       |

To protect a new route, declare the signed-in user as a parameter:

```python
from app.api.deps import CurrentUser

@router.get("/reports")
def list_reports(user: CurrentUser): ...  # 401 when not signed in
```

## Project layout

```
app/
  main.py               app factory, CORS, error handlers
  core/                 settings, Argon2 + tokens, cookies, errors, rate limiter
  db/                   engine, session dependency, Base + UTCDateTime
  models/               User, AuthSession
  schemas/              request/response models and validation rules
  services/auth.py      register, authenticate, issue/resolve/revoke sessions
  api/                  deps (CurrentUser) and routes (auth, health)
migrations/             Alembic (alembic upgrade head)
scripts/                seed_demo_users, create_user
tests/                  pytest suite
```

## Tests and lint

```bash
pytest          # temp SQLite database; set TEST_DATABASE_URL to run on PostgreSQL
ruff check .
alembic check   # fails if the models and migrations have drifted
```

The tests never touch your development database.
