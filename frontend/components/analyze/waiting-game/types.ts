import type { SimilarityLevel } from "@/lib/analysis/types";

/**
 * What the game is allowed to know about the analysis. The Analyze page owns the job
 * (upload, polling, signature check, saving); the game only reads this snapshot.
 */
export type JobView = {
  status: "running" | "ready" | "failed";
  /** The current step in words, e.g. "Embedding passages with LaBSE". */
  step: string;
  /** Rough progress, 0–1 (the AI service does not report a percentage). */
  progress: number;
  /** Seconds since the analysis started. */
  elapsed: number;
  /** While queued, how many analyses are ahead of this one (0 = next); otherwise null. */
  position: number | null;
  reportId: string | null;
  title: string;
  level: SimilarityLevel | null;
  error: { step: string; message: string } | null;
};

export type GameWindowProps = {
  job: JobView;
  minimised: boolean;
  onMinimise: () => void;
  onRestore: () => void;
  onClose: () => void;
  onViewReport: () => void;
  onRetry: () => void;
};
