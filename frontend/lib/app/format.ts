/** Formatting helpers for the dashboard. Dates are shown in Bangladesh time. */

const TIME_ZONE = "Asia/Dhaka";

/** 0.4237 -> "42%". */
export function pct(value: number | null | undefined): string {
  return `${Math.round((value ?? 0) * 100)}%`;
}

export function formatDate(iso: string | null | undefined, withTime = true): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
  }).format(new Date(iso));
}

/** "just now", "5 min ago", "3 days ago"; falls back to a date after a month. */
export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(iso, false);
}

/** Whole days since a moment (for review waiting times). */
export function daysSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

const BENGALI = /[ঀ-৿]/;
const BENGALI_ALL = /[ঀ-৿]/g;
const LATIN_ALL = /[A-Za-z]/g;

export type TextLanguage = "en" | "bn" | "mixed";

/** A quick guess from the script: Bangla letters are U+0980–U+09FF. */
export function detectLanguage(text: string): TextLanguage | null {
  const bn = text.match(BENGALI_ALL)?.length ?? 0;
  const en = text.match(LATIN_ALL)?.length ?? 0;
  if (bn + en < 8) return null;
  const share = bn / (bn + en);
  if (share > 0.85) return "bn";
  if (share < 0.15) return "en";
  return "mixed";
}

export const LANGUAGE_LABELS: Record<TextLanguage, string> = {
  en: "English",
  bn: "Bangla",
  mixed: "Mixed",
};

export function hasBangla(text: string | null | undefined): boolean {
  return BENGALI.test(text ?? "");
}

/** Mostly Bangla letters: used to label a match that crosses languages. */
export function isMostlyBangla(text: string): boolean {
  const bn = text.match(BENGALI_ALL)?.length ?? 0;
  const en = text.match(LATIN_ALL)?.length ?? 0;
  return bn + en > 0 && bn / (bn + en) > 0.5;
}

/** Props for an element that may hold Bangla: the right lang tag picks the Bangla font. */
export function langProps(text: string | null | undefined): { lang?: string } {
  return hasBangla(text) ? { lang: "bn" } : {};
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}
