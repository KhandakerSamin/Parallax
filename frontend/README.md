# Parallax — Frontend

The landing page and auth flows for **Parallax**, a multi-perspective similarity system for Bangla-English academic documents at Daffodil International University. Parallax reports **potential similarity**, never a plagiarism verdict.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Radix UI (shadcn-style components) · Framer Motion · Lenis · react-hook-form + zod · next-themes · Sonner

## Getting started

Requires Node.js 20.9 or newer.

```bash
cd frontend
npm install
cp .env.example .env.local   # optional: the defaults work for local development
npm run dev                  # http://localhost:3000
```

Sign-in uses the FastAPI backend, so start it too (see [backend/README.md](../backend/README.md)):

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

No backend at hand (for example, an offline demo)? Set `NEXT_PUBLIC_USE_MOCK_AUTH=true` in `.env.local` to use the built-in mock instead. Both use the same demo accounts:

| Account  | Email / ID                           | Password        |
| -------- | ------------------------------------ | --------------- |
| Student  | `student@diu.edu.bd` / `221-35-001`  | `Parallax#2026` |
| Reviewer | `reviewer@diu.edu.bd` / `STAFF-0042` | `Parallax#2026` |

On the real backend, accounts are stored in its database (PostgreSQL, or SQLite locally), and the demo accounts come from `python -m scripts.seed_demo_users`. In mock mode, accounts you create live in memory and reset when the server restarts.

### Scripts

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Development server                  |
| `npm run build`     | Production build                    |
| `npm run start`     | Serve the production build          |
| `npm run lint`      | ESLint                              |
| `npm run typecheck` | `tsc --noEmit`                      |
| `npm run format`    | Prettier (with Tailwind class sort) |

## Environment variables

| Variable                            | Default                             | Purpose                                                                      |
| ----------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`              | `http://localhost:3000`             | Absolute URL for metadata, Open Graph and the sitemap. Set it in production. |
| `NEXT_PUBLIC_USE_MOCK_AUTH`         | `false`                             | `true` uses the built-in mock instead of the backend.                        |
| `NEXT_PUBLIC_API_URL`               | `/api/v1`                           | Backend base path as the browser sees it. Keep it same-origin.               |
| `BACKEND_URL`                       | `http://localhost:8000`             | Where Next.js forwards `/api/v1/*` (server-side only).                       |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` | `diu.edu.bd,daffodilvarsity.edu.bd` | Comma-separated domains allowed at sign-up. Subdomains are accepted too.     |
| `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES`  | `30`                                | Automatic sign-out after inactivity, with a warning one minute before.       |
| `AUTH_COOKIE_NAME`                  | `parallax_session`                  | Session cookie that `proxy.ts` checks to guard `/dashboard`.                 |

`NEXT_PUBLIC_*` values are baked in at build time, so rebuild after changing them.

## Project structure

```
app/
  page.tsx                  landing page (composes the sections)
  (auth)/                   sign-in, sign-up, forgot-password + split-screen layout
  dashboard/page.tsx        protected placeholder dashboard
  api/mock-auth/            mock login / register / logout / me handlers
  opengraph-image.tsx, robots.ts, sitemap.ts, icon.svg
components/
  landing/                  one component per landing section
  layout/                   Navbar, MobileNav, UserMenu, Footer, ScrollProgress, BackToTop…
  motion/                   Reveal/Stagger, CountUp, ParallaxLayer, TiltStage, SpotlightCard, MarkerHighlight
  auth/                     forms, BrandPanel, PasswordStrength, SignOutDialog
  providers/                Theme, Motion (reduced motion + Lenis), Auth
  ui/                       Radix-based primitives
hooks/                      useActiveSection, useReducedMotion, useIdleLogout
lib/
  constants/content.ts      all landing-page copy
  auth/                     types, config, zod schemas, API client, mock store, cookies
proxy.ts                    route guard (Next.js 16 name for middleware)
```

All landing copy lives in `lib/constants/content.ts`. Sample and target numbers are labelled as such in the UI.

## Auth: mock vs real

The UI always talks to `lib/auth/api.ts`. That client sends requests to `/api/v1/auth/*`, which `next.config.ts` rewrites to the FastAPI backend, or, in mock mode, to the handlers at `/api/mock-auth/*`. Both use identical request and response shapes. Because the browser only ever calls its own origin, the backend's session cookie belongs to the frontend's domain. The session is an **httpOnly cookie**. Nothing auth-related is stored in `localStorage`, and the client sends `credentials: "include"` on every call.

`proxy.ts` is an _optimistic_ guard. It only checks that the session cookie exists before letting someone into `/dashboard`, and it redirects signed-in users away from `/sign-in` and `/sign-up`. The real check happens in the API, on `GET /auth/me`.

### Backend endpoints

Implemented in `backend/` (FastAPI). Paths are relative to `/api/v1`.

All bodies are JSON. Errors return `{ "message": string }` with a suitable status code.

**`POST /auth/register`**

```jsonc
// request
{ "name": "Nusrat Jahan", "email": "nusrat@diu.edu.bd", "universityId": "221-35-123",
  "role": "student" /* or "reviewer" */, "department": "Software Engineering", "password": "…" }
// 201
{ "user": User }   // + Set-Cookie: <session>; HttpOnly; SameSite=Lax; Secure
// 400 validation failed · 409 { "message": "…", "field": "email" | "universityId" }
```

**`POST /auth/login`**

```jsonc
// request — identifier is the university email or student/staff ID
{ "identifier": "nusrat@diu.edu.bd", "password": "…", "remember": true }
// 200
{ "user": User }   // + Set-Cookie (30-day Max-Age when remember is true, session cookie otherwise)
// 401 { "message": "Incorrect email/ID or password." }  — same message for unknown user and wrong password
```

**`POST /auth/logout`** → `204`, and clears the cookie.

**`GET /auth/me`** → `200 { "user": User }` when signed in. When signed out, return either `200 { "user": null }` or `401`.

```ts
type User = {
    id: string;
    name: string;
    email: string;
    universityId: string; // unique (FR02)
    role: "student" | "reviewer" | "researcher" | "admin" | "super_admin";
    department: string;
};
```

The server must also enforce what the UI enforces: the allowed email domains, the password rules (8+ characters with upper, lower, number and symbol), self-registration only as student or reviewer, and hashed passwords (never stored or logged in plain text).

### Deploying

1. Set `BACKEND_URL` to the backend's address and keep `NEXT_PUBLIC_API_URL=/api/v1`.
2. Use the same `AUTH_COOKIE_NAME` on both sides.
3. Run the backend with `APP_ENV=production`, so its cookies are `Secure`.
4. For "Continue with Google", set the backend's `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `PUBLIC_URL` (see [backend/README.md](../backend/README.md#google-sign-in)). Until those are set, the button returns to sign-in with a "not set up yet" message. First-time Google users finish signing up at `/sign-up/google`.

## Quality checks

The current build was verified with:

- `npm run typecheck`, `npm run lint`, `prettier --check .` and `npm run build`: no errors
- **Lighthouse** on the landing page:
    - desktop: Performance 99, Accessibility 100, Best Practices 100, SEO 100
    - mobile (simulated throttling): Performance 83, Accessibility 100, Best Practices 100, SEO 100
- **axe-core** (WCAG 2.1 AA): 0 violations on `/`, `/sign-in`, `/sign-up`, `/forgot-password` and `/dashboard`, in light and dark themes
- No horizontal scroll at 360, 768, 1024, 1440 or 1920px
- End-to-end browser checks:
    - validation errors and wrong-password handling
    - sign-in by email and by ID, proxy redirects, user menu
    - sign-out dialog, sign-up with domain and duplicate-ID checks

Motion respects `prefers-reduced-motion`: Lenis and parallax are turned off, count-ups jump straight to their final value, and decorative loops stop.
