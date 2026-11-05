"use client";

import { motion } from "framer-motion";
import type { Perspective } from "@/lib/constants/content";
import { formatScore } from "@/lib/utils";

type ScoreBarProps = {
  perspective: Perspective;
  score: number;
  delay?: number;
  compact?: boolean;
};

/** A labelled perspective bar: icon + name + value, never colour alone. */
export function ScoreBar({ perspective, score, delay = 0, compact = false }: ScoreBarProps) {
  const Icon = perspective.icon;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span
          className="flex items-center gap-1.5 font-medium"
          style={{ color: perspective.color }}
        >
          <Icon className="size-3.5" aria-hidden />
          <span className="text-foreground">{perspective.name}</span>
        </span>
        <span className="text-muted-foreground font-mono tabular-nums">{formatScore(score)}</span>
      </div>
      <div
        className={
          compact
            ? "bg-muted h-1.5 overflow-hidden rounded-full"
            : "bg-muted h-2 overflow-hidden rounded-full"
        }
        role="meter"
        aria-label={`${perspective.name} score`}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={score}
      >
        <motion.div
          className="h-full origin-left rounded-full"
          style={{ background: perspective.color }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: score }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
