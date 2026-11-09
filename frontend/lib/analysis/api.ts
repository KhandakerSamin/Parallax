import { API_URL } from "@/lib/auth/config";
import { AnalysisError, type AnalysisResult, type SavedAnalysis } from "./types";

/** Largest PDF the backend accepts (MAX_UPLOAD_MB on the server). */
export const MAX_UPLOAD_MB = 25;
/** Fewest words worth comparing; the backend enforces the same limit. */
export const MIN_WORDS = 20;

async function send(path: string, init: RequestInit): Promise<AnalysisResult> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/analysis${path}`, { ...init, credentials: "include" });
  } catch {
    throw new AnalysisError("Can't reach the server. Check your connection and try again.", 0);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : res.status >= 500
          ? "The analysis service is not available right now. Please try again shortly."
          : "The analysis failed. Please try again.";
    throw new AnalysisError(message, res.status);
  }
  return body as AnalysisResult;
}

export function analyzeText(text: string, title?: string): Promise<AnalysisResult> {
  return send("/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, title: title || null }),
  });
}

export function analyzePdf(file: File): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("file", file);
  return send("/pdf", { method: "POST", body: form });
}

// ----- Last result, kept for this tab so a refresh doesn't lose it -----------

const STORAGE_KEY = "parallax:last-analysis";

export function saveAnalysis(saved: SavedAnalysis): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Storage full or blocked: the result still shows, it just won't survive a refresh.
  }
}

export function loadAnalysis(): SavedAnalysis | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedAnalysis) : null;
  } catch {
    return null;
  }
}

export function clearAnalysis(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
