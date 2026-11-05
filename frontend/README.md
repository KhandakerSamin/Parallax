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

Mock auth is on by default, so you can sign in without a backend:

| Account  | Email / ID                           | Password        |
| -------- | ------------------------------------ | --------------- |
| Student  | `student@diu.edu.bd` / `221-35-001`  | `Parallax#2026` |
| Reviewer | `reviewer@diu.edu.bd` / `STAFF-0042` | `Parallax#2026` |

Accounts you create on `/sign-up` live in memory and reset when the server restarts.

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
| `NEXT_PUBLIC_USE_MOCK_AUTH`         | `true`                              | `true` uses the built-in mock. `false` calls the real API.                   |
| `NEXT_PUBLIC_API_URL`               | `http://localhost:4000`             | Base URL of the Express auth API (used when mock auth is off).               |
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

The UI always talks to `lib/auth/api.ts`. That client sends requests either to the mock handlers at `/api/mock-auth/*` or to `${NEXT_PUBLIC_API_URL}/auth/*`, with identical request and response shapes. The session is an **httpOnly cookie**. Nothing auth-related is stored in `localStorage`, and the client sends `credentials: "include"` on every call.

`proxy.ts` is an _optimistic_ guard. It only checks that the session cookie exists before letting someone into `/dashboard`, and it redirects signed-in users away from `/sign-in` and `/sign-up`. The real check happens in the API, on `GET /auth/me`.

### Expected Express endpoints

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

### Switching to the real backend

1. Set `NEXT_PUBLIC_USE_MOCK_AUTH=false` and `NEXT_PUBLIC_API_URL`.
2. Enable CORS with `credentials: true` for the frontend origin on the Express API.
3. `proxy.ts` can only see cookies on the frontend's own domain. Either serve the API on the same site (for example, rewrite `/api/auth/*` to Express from `next.config.ts`), or set the cookie on a shared parent domain using the same `AUTH_COOKIE_NAME`.
4. Implement `GET /auth/google` if you keep the "Continue with Google" button. Today it only shows a toast.

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
