/** Client-safe auth settings, read from NEXT_PUBLIC_* env vars (see .env.example). */

export const USE_MOCK_AUTH = (process.env.NEXT_PUBLIC_USE_MOCK_AUTH ?? "true") !== "false";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(
  /\/$/,
  "",
);

/** Base URL for auth calls: the built-in mock route handlers, or the Express API. */
export const AUTH_BASE = USE_MOCK_AUTH ? "/api/mock-auth" : `${API_URL}/auth`;

export const ALLOWED_EMAIL_DOMAINS = (
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS ?? "diu.edu.bd,daffodilvarsity.edu.bd"
)
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const idleMinutes = Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES ?? "30");
export const IDLE_TIMEOUT_MS =
  (Number.isFinite(idleMinutes) && idleMinutes > 0 ? idleMinutes : 30) * 60_000;

/** Show the "you'll be signed out" warning this long before the idle timeout. */
export const IDLE_WARNING_MS = 60_000;

export const DEPARTMENTS = [
  "Software Engineering",
  "Computer Science and Engineering",
  "Electrical and Electronic Engineering",
  "Information and Communication Engineering",
  "Multimedia and Creative Technology",
  "Other",
] as const;
