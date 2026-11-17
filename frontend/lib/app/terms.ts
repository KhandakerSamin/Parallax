/**
 * The built product's vocabulary for the dashboard and the PDF: perspectives, levels,
 * reviewer decisions and the corpus. Older landing-page wording (lib/constants/content.ts)
 * is not used here.
 */
import { Boxes, Brain, KeyRound, Type, type LucideIcon } from "lucide-react";
import type { ReviewStatus, SimilarityLevel } from "@/lib/analysis/types";

export type PerspectiveKey = "lexical" | "semantic" | "concept" | "structural";

export type PerspectiveInfo = {
  key: PerspectiveKey;
  name: string;
  /** What it asks, in one line. */
  question: string;
  /** How it is measured, in one line. */
  method: string;
  weight: number;
  icon: LucideIcon;
  color: string;
  soft: string;
};

export const PERSPECTIVES: readonly PerspectiveInfo[] = [
  {
    key: "lexical",
    name: "Lexical",
    question: "Are the same words used?",
    method: "Compares the exact wording, sentence by sentence.",
    weight: 0.2,
    icon: Type,
    color: "var(--lexical)",
    soft: "var(--lexical-soft)",
  },
  {
    key: "semantic",
    name: "Semantic",
    question: "Is the same thing said, even reworded or translated?",
    method: "LaBSE places passages with the same meaning close together, in English or Bangla.",
    weight: 0.35,
    icon: Brain,
    color: "var(--semantic)",
    soft: "var(--semantic-soft)",
  },
  {
    key: "concept",
    name: "Concept",
    question: "Do they share the same distinctive key terms?",
    method: "Compares each report's rare, distinctive key terms.",
    weight: 0.25,
    icon: KeyRound,
    color: "var(--concept)",
    soft: "var(--concept-soft)",
  },
  {
    key: "structural",
    name: "Structural",
    question: "Are the chapters and sections in the same order?",
    method: "Aligns the two heading outlines, ignoring the shared DIU template.",
    weight: 0.2,
    icon: Boxes,
    color: "var(--structural)",
    soft: "var(--structural-soft)",
  },
];

export const PERSPECTIVE: Record<PerspectiveKey, PerspectiveInfo> = Object.fromEntries(
  PERSPECTIVES.map((p) => [p.key, p]),
) as Record<PerspectiveKey, PerspectiveInfo>;

export type LevelInfo = { label: string; range: string; color: string; soft: string };

export const LEVELS: Record<SimilarityLevel, LevelInfo> = {
  high: {
    label: "High",
    range: "40% or more",
    color: "var(--level-high)",
    soft: "var(--level-high-soft)",
  },
  moderate: {
    label: "Moderate",
    range: "15% to under 40%",
    color: "var(--level-moderate)",
    soft: "var(--level-moderate-soft)",
  },
  low: {
    label: "Low",
    range: "under 15%",
    color: "var(--level-low)",
    soft: "var(--level-low-soft)",
  },
};

export const DECISIONS: Record<ReviewStatus, { label: string; meaning: string }> = {
  pending: { label: "Awaiting review", meaning: "Not decided yet." },
  cleared: {
    label: "No concern",
    meaning: "The similarity is explained: shared topic, standard method or proper citation.",
  },
  follow_up: {
    label: "Needs follow-up",
    meaning: "Some passages need a conversation with the student or supervisor.",
  },
};

export const CORPUS = {
  reports: 1925,
  passages: 209386,
  scope: "Software Engineering and CSE reports from DIU DSpace, 2018–2025",
} as const;

export const FOOTER_NOTE =
  "Results show potential similarity, never a verdict. Reviewers make the final call.";
