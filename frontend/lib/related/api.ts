import { API_URL } from "@/lib/auth/config";
import { AnalysisError, type SourceInfo } from "@/lib/analysis/types";

/** Fewest words the backend accepts for an idea. */
export const MIN_IDEA_WORDS = 8;
export const MAX_IDEA_CHARS = 5000;

export type Closeness = "close" | "related" | "distant";

export type RelatedReport = {
  source: SourceInfo;
  score: number;
  closeness: Closeness;
  section: string;
  excerpt: string;
  shared_terms: string[];
};

/** A 429 from the search: `retryAfter` is how many seconds to wait. */
export class TooManySearchesError extends AnalysisError {
  constructor(
    message: string,
    readonly retryAfter: number,
  ) {
    super(message, 429);
    this.name = "TooManySearchesError";
  }
}

export type RelatedResult = {
  reports: RelatedReport[];
  /** The idea's key terms that none of the shown reports share. */
  idea_terms: string[];
  corpus: { documents: number; passages: number };
};

/** POST /api/v1/related-work: earlier reports close to an idea. Nothing is saved. */
export async function findRelatedWork(text: string, limit = 10): Promise<RelatedResult> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/related-work`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, limit }),
    });
  } catch {
    throw new AnalysisError("Can't reach the server. Check your connection and try again.", 0);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : res.status === 404
          ? "This feature isn't available on the server yet. Please try again later."
          : res.status >= 500
            ? "The search service is not available right now. Please try again shortly."
            : "The search failed. Please try again.";
    if (res.status === 429) {
      const seconds = Number(res.headers.get("Retry-After"));
      throw new TooManySearchesError(
        message,
        Number.isFinite(seconds) && seconds > 0 ? seconds : 60,
      );
    }
    throw new AnalysisError(message, res.status);
  }
  return body as RelatedResult;
}
