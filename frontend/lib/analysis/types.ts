/**
 * Shapes returned by POST /api/v1/analysis/* (the AI service's AnalysisResult).
 * Scores are shares in [0, 1]; the UI shows them as percentages. Every score is
 * *potential* similarity for a person to review, never a verdict.
 */

export type SimilarityLevel = "low" | "moderate" | "high";
export type EvidencePerspective = "lexical" | "semantic";

export type SourceInfo = {
  id: string;
  title: string;
  authors: string[];
  supervisor?: string | null;
  year?: string | null;
  type?: string | null;
  url?: string | null;
};

export type Excerpt = { text: string; section: string };

export type Evidence = {
  perspective: EvidencePerspective;
  score: number;
  submitted: Excerpt;
  source: Excerpt;
};

export type HeadingPair = { submitted: string; source: string };

export type Match = {
  source: SourceInfo;
  /** Text reuse: the larger of lexical and semantic. Decides the level. */
  overall: number;
  /** Weighted blend of all four perspectives (see AnalysisResult.weights). */
  hybrid?: number;
  scores: { lexical: number; semantic: number; concept?: number; structural?: number };
  evidence: Evidence[];
  /** Key terms both reports revolve around. */
  shared_terms?: string[];
  /** Headings the two outlines share, in order. */
  shared_headings?: HeadingPair[];
};

export type AnalysisResult = {
  document: {
    id: string;
    title?: string | null;
    words: number;
    passages: number;
    language: string;
    flags: string[];
  };
  summary: {
    overall: number;
    lexical_coverage: number;
    semantic_coverage: number;
    level: SimilarityLevel;
    hybrid?: number;
  };
  matches: Match[];
  corpus: Record<string, number | string>;
  weights?: Record<string, number>;
  notes: string[];
  /** Set when the backend saved this analysis as a report. */
  report_id?: string;
};

/** A saved report as the list shows it (GET /reports). */
export type ReportSummary = {
  id: string;
  title: string;
  sourceKind: "pdf" | "text";
  sourceName: string;
  overall: number;
  hybrid: number;
  level: SimilarityLevel;
  words: number;
  matchCount: number;
  topSourceTitle: string | null;
  createdAt: string;
  /** The owner's account id: only the owner may delete a report. */
  userId?: string | null;
  /** Who wrote it: shown to reviewers. */
  ownerName?: string | null;
  ownerUniversityId?: string | null;
  /** A reviewer's decision; the score never decides. */
  reviewStatus?: ReviewStatus;
  reviewNote?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
};

export type ReviewStatus = "pending" | "cleared" | "follow_up";

export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  pending: "Awaiting review",
  cleared: "No concern",
  follow_up: "Needs follow-up",
};

/** One saved report with its full result (GET /reports/{id}). */
export type SavedReport = { report: ReportSummary; result: AnalysisResult };

/** An analysis kept for this browser tab, with when and what was analysed. */
export type SavedAnalysis = {
  result: AnalysisResult;
  analyzedAt: string;
  sourceName: string;
};

export class AnalysisError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}
