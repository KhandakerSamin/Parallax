"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import type { SimilarityLevel } from "@/lib/analysis/types";
import { pct } from "@/lib/app/format";
import { LEVELS, PERSPECTIVES, type PerspectiveInfo, type PerspectiveKey } from "@/lib/app/terms";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** The overall score as a ring that fills from 0, with the percentage in the middle. */
export function ScoreRing({
  value,
  level,
  size = 168,
  stroke = 14,
  label = "overall",
}: {
  value: number;
  level: SimilarityLevel;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const id = useId();
  const r = (size - stroke) / 2;
  const colour = (LEVELS[level] ?? LEVELS.low).color;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${pct(value)} ${label}, ${(LEVELS[level] ?? LEVELS.low).label} level`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor={colour} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: reduced ? Math.max(value, 0.001) : 0 }}
          animate={{ pathLength: Math.max(value, 0.001) }}
          transition={{ duration: reduced ? 0 : 0.9, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-semibold tracking-tight tabular-nums"
          style={{ fontSize: size * 0.24 }}
        >
          {pct(value)}
        </span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
    </div>
  );
}

/** One perspective's score as a labelled bar: icon + name + value, never colour alone. */
export function PerspectiveBar({
  perspective,
  value,
  delay = 0,
  className,
}: {
  perspective: PerspectiveInfo;
  value: number;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const Icon = perspective.icon;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className="size-3.5" style={{ color: perspective.color }} aria-hidden />
          {perspective.name}
        </span>
        <span className="text-muted-foreground tabular-nums">{pct(value)}</span>
      </div>
      <div
        className="bg-muted h-2 overflow-hidden rounded-full"
        role="meter"
        aria-label={`${perspective.name} score`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
      >
        <motion.div
          className="h-full origin-left rounded-full"
          style={{ background: perspective.color }}
          initial={{ scaleX: reduced ? value : 0 }}
          animate={{ scaleX: value }}
          transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : delay, ease: EASE }}
        />
      </div>
    </div>
  );
}

/** Four thin segments, one per perspective, each filled to its score. */
export function PerspectiveMiniBar({
  scores,
  className,
}: {
  scores: Partial<Record<PerspectiveKey, number>>;
  className?: string;
}) {
  const label = PERSPECTIVES.map((p) => `${p.name} ${pct(scores[p.key] ?? 0)}`).join(", ");
  return (
    <div className={cn("grid grid-cols-4 gap-1", className)} role="img" aria-label={label}>
      {PERSPECTIVES.map((p) => (
        <span
          key={p.key}
          className="bg-muted block h-1.5 overflow-hidden rounded-full"
          title={`${p.name} ${pct(scores[p.key] ?? 0)}`}
        >
          <span
            className="block h-full rounded-full"
            style={{ width: `${Math.round((scores[p.key] ?? 0) * 100)}%`, background: p.color }}
          />
        </span>
      ))}
    </div>
  );
}
