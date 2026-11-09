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

export type Match = {
  source: SourceInfo;
  overall: number;
  scores: { lexical: number; semantic: number };
  evidence: Evidence[];
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
  };
  matches: Match[];
  corpus: Record<string, number | string>;
  notes: string[];
};

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
