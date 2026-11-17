import { API_URL } from "@/lib/auth/config";
import {
  AnalysisError,
  type AnalysisResult,
  type ReportSummary,
  type ReviewStatus,
  type SavedAnalysis,
  type SavedReport,
  type SimilarityLevel,
} from "./types";

/** Largest PDF the backend accepts (MAX_UPLOAD_MB on the server). */
export const MAX_UPLOAD_MB = 25;
/** Fewest words worth comparing; the backend enforces the same limit. */
export const MIN_WORDS = 20;

async function send<T = AnalysisResult>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, credentials: "include" });
  } catch {
    throw new AnalysisError("Can't reach the server. Check your connection and try again.", 0);
  }
  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    // 404 on an endpoint (not on a single report) means this server predates the feature.
    const missingFeature = res.status === 404 && !/^\/reports\/./.test(path);
    // The hosting platform rejects large uploads (about 4.5 MB) before our server sees them,
    // so this 413 has no JSON body of ours.
    const tooLargeForHost =
      res.status === 413 && !(body && typeof body === "object" && "message" in body);
    const message = missingFeature
      ? "This feature isn't available on the server yet. Please try again later."
      : tooLargeForHost
        ? "This PDF is too large for the online version (about 4 MB at most). Paste the text instead, or try a smaller file."
        : body && typeof body === "object" && "message" in body && typeof body.message === "string"
          ? body.message
          : res.status >= 500
            ? "The analysis service is not available right now. Please try again shortly."
            : "The analysis failed. Please try again.";
    throw new AnalysisError(message, res.status);
  }
  return body as T;
}

export function analyzeText(text: string, title?: string): Promise<AnalysisResult> {
  return send("/analysis/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, title: title || null }),
  });
}

type UploadTicket = { aiUrl: string; ticket: string; maxUploadMb: number };

function aiMessage(status: number, body: unknown): string {
  const detail = body && typeof body === "object" && "detail" in body ? body.detail : null;
  if (typeof detail === "string") return detail;
  if (status === 401) return "Your upload pass expired. Please try again.";
  if (status === 413) return `The file is over ${MAX_UPLOAD_MB} MB.`;
  if (status >= 500)
    return "The analysis service is starting up or busy. Please try again in a minute.";
  return "The analysis failed. Please try again.";
}

/** Where a PDF analysis is, for the progress panel. */
export type PdfPhase = "ticket" | "uploading" | "processing" | "saving";

export type PdfProgress = {
  onPhase?: (phase: PdfPhase) => void;
  /** Share of the file sent so far, 0–1. */
  onUpload?: (fraction: number) => void;
};

/** A failure that remembers which phase it happened in, so the UI can name the step. */
export class PdfAnalysisError extends AnalysisError {
  constructor(
    message: string,
    status: number,
    readonly phase: PdfPhase,
  ) {
    super(message, status);
    this.name = "PdfAnalysisError";
  }
}

type RawResponse = { ok: boolean; status: number; body: unknown };

/** POST a form with upload progress (fetch cannot report upload progress). */
function postWithProgress(
  url: string,
  form: FormData,
  headers: Record<string, string>,
  onProgress?: (fraction: number) => void,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body });
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(form);
  });
}

/**
 * Analyze a PDF. The file goes straight to the AI service with a short-lived pass
 * from our backend, because the website's host rejects large uploads. The AI
 * service signs its result, and the backend saves it only if the signature holds.
 * The browser makes that last saving call, so closing the tab before then loses the result.
 */
export async function analyzePdf(file: File, progress: PdfProgress = {}): Promise<AnalysisResult> {
  const fail =
    (phase: PdfPhase) =>
    (err: unknown): never => {
      if (err instanceof PdfAnalysisError) throw err;
      const status = err instanceof AnalysisError ? err.status : 0;
      const message =
        err instanceof AnalysisError
          ? err.message
          : "Can't reach the analysis service. It may be waking up; please try again in a minute.";
      throw new PdfAnalysisError(message, status, phase);
    };

  progress.onPhase?.("ticket");
  const form = new FormData();
  form.append("file", file);
  let pass: UploadTicket;
  try {
    pass = await send<UploadTicket>("/analysis/ticket", { method: "POST" });
  } catch (err) {
    // An older backend without tickets: upload through it instead.
    if (err instanceof AnalysisError && err.status === 404) {
      progress.onPhase?.("processing");
      return send("/analysis/pdf", { method: "POST", body: form }).catch(fail("processing"));
    }
    return fail("ticket")(err);
  }

  // Start a background job, then check back until it finishes: a long report can
  // take minutes, longer than the host keeps a single request open.
  const headers = { "X-Parallax-Ticket": pass.ticket };
  progress.onPhase?.("uploading");
  let started: RawResponse;
  try {
    started = await postWithProgress(`${pass.aiUrl}/jobs`, form, headers, progress.onUpload);
  } catch (err) {
    return fail("uploading")(err);
  }
  if (!started.ok) {
    throw new PdfAnalysisError(
      aiMessage(started.status, started.body),
      started.status,
      "uploading",
    );
  }
  progress.onUpload?.(1);
  progress.onPhase?.("processing");

  type Job = {
    id?: string;
    status: string;
    result?: unknown;
    error?: string;
    error_status?: number;
  };
  let current = started.body as Job;
  const deadline = Date.now() + 20 * 60_000;
  while (current.status === "queued" || current.status === "running") {
    if (Date.now() > deadline) {
      throw new PdfAnalysisError(
        "The analysis is taking unusually long. Please try again later.",
        504,
        "processing",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
    let poll: Response;
    try {
      poll = await fetch(`${pass.aiUrl}/jobs/${current.id}`, { headers });
    } catch (err) {
      return fail("processing")(err);
    }
    const body: unknown = await poll.json().catch(() => null);
    if (!poll.ok) {
      throw new PdfAnalysisError(aiMessage(poll.status, body), poll.status, "processing");
    }
    current = body as Job;
  }
  if (current.status === "failed") {
    throw new PdfAnalysisError(
      current.error ?? "The analysis failed. Please try again.",
      current.error_status ?? 500,
      "processing",
    );
  }

  progress.onPhase?.("saving");
  const analysis = current.result as AnalysisResult & { signature?: string };
  const { report } = await send<SavedReport>("/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      result: analysis,
      signature: analysis.signature ?? "",
      sourceKind: "pdf",
      sourceName: file.name,
    }),
  }).catch(fail("saving"));
  return { ...analysis, report_id: report.id };
}

// ----- Saved reports ---------------------------------------------------------

export async function listReports(limit = 100): Promise<ReportSummary[]> {
  const { reports } = await send<{ reports: ReportSummary[] }>(`/reports?limit=${limit}`, {
    method: "GET",
  });
  return reports;
}

/**
 * Download a report as a PDF (built on the server from the saved result). Errors come
 * back as JSON, so the file is fetched first and saved only when it really is a PDF.
 */
export async function downloadReportPdf(id: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/reports/${encodeURIComponent(id)}/pdf`, {
      credentials: "include",
    });
  } catch {
    throw new AnalysisError("Can't reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : res.status === 404
          ? "Report not found."
          : "The PDF could not be created. Please try again.";
    throw new AnalysisError(message, res.status);
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const name =
    /filename="([^"]+)"/.exec(disposition)?.[1] ?? `Parallax-Report_${id.slice(0, 8)}.pdf`;
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function getReport(id: string): Promise<SavedReport> {
  return send<SavedReport>(`/reports/${encodeURIComponent(id)}`, { method: "GET" });
}

export async function listReviewQueue(filters: {
  status?: ReviewStatus;
  level?: SimilarityLevel;
  limit?: number;
}): Promise<ReportSummary[]> {
  const params = new URLSearchParams();
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.status) params.set("status", filters.status);
  if (filters.level) params.set("level", filters.level);
  const query = params.size ? `?${params}` : "";
  const { reports } = await send<{ reports: ReportSummary[] }>(`/reviews${query}`, {
    method: "GET",
  });
  return reports;
}

export function recordReview(id: string, status: ReviewStatus, note: string): Promise<SavedReport> {
  return send<SavedReport>(`/reports/${encodeURIComponent(id)}/review`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, note: note.trim() || null }),
  });
}

export function deleteReport(id: string): Promise<void> {
  return send<void>(`/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
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
