"use client";

import { motion, useMotionValueEvent, useSpring } from "framer-motion";
import { FlaskConical, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_WEIGHTS,
  PERSPECTIVES,
  SAMPLE_SCORES,
  WEIGHT_PRESETS,
  type PerspectiveKey,
} from "@/lib/constants/content";
import { formatScore } from "@/lib/utils";

type Weights = Record<PerspectiveKey, number>;
const KEYS = PERSPECTIVES.map((p) => p.key);

/** Set one weight and rescale the others proportionally so all four still sum to 1. */
function rebalance(weights: Weights, key: PerspectiveKey, value: number): Weights {
  const others = KEYS.filter((k) => k !== key);
  const othersSum = others.reduce((sum, k) => sum + weights[k], 0);
  const remaining = 1 - value;
  const next = { ...weights, [key]: value };
  for (const k of others) {
    next[k] = othersSum > 0 ? (weights[k] / othersSum) * remaining : remaining / others.length;
  }
  return next;
}

function hybrid(weights: Weights): number {
  return KEYS.reduce((sum, k) => sum + weights[k] * SAMPLE_SCORES[k], 0);
}

/** Number that springs smoothly to its new value without re-rendering React. */
function AnimatedScore({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const spring = useSpring(value, { stiffness: 140, damping: 22 });
  useEffect(() => spring.set(value), [spring, value]);
  useMotionValueEvent(spring, "change", (v) => {
    if (ref.current) ref.current.textContent = formatScore(v);
  });
  return (
    <span ref={ref} className="tabular-nums">
      {formatScore(value)}
    </span>
  );
}

export function ScorePlayground() {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const final = hybrid(weights);

  return (
    <div className="border-border bg-card shadow-lift grid gap-6 rounded-3xl border p-5 sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-h3">Hybrid score playground</h3>
          <div className="flex flex-wrap gap-2">
            {WEIGHT_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                size="sm"
                variant="outline"
                onClick={() => setWeights({ ...preset.weights })}
              >
                {preset.name === "Default" && <RotateCcw aria-hidden />}
                {preset.name}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          Drag a weight and the others adjust so all four always sum to 1. Perspective scores below
          are a fixed sample pair.
        </p>

        <div className="mt-8 space-y-6">
          {PERSPECTIVES.map((p) => (
            <div key={p.key}>
              <div className="mb-2.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <p.icon className="size-4" style={{ color: p.color }} aria-hidden />
                  {p.name}
                  <span className="text-muted-foreground text-xs font-normal">
                    score {formatScore(SAMPLE_SCORES[p.key])}
                  </span>
                </span>
                <span className="font-mono text-sm tabular-nums">
                  w = {formatScore(weights[p.key])}
                </span>
              </div>
              <Slider
                value={[weights[p.key]]}
                min={0}
                max={1}
                step={0.01}
                color={p.color}
                thumbLabel={`${p.name} weight`}
                onValueChange={([v]) =>
                  v !== undefined && setWeights((w) => rebalance(w, p.key, v))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-muted flex flex-col justify-between gap-6 rounded-2xl p-5 sm:p-6">
        <div>
          <p className="text-muted-foreground text-sm">Hybrid score (sample pair)</p>
          <p className="text-gradient mt-1 text-6xl font-semibold tracking-tight">
            <AnimatedScore value={final} />
          </p>

          {/* Each segment is one perspective's contribution w·s */}
          <div className="bg-card mt-5 flex h-3 overflow-hidden rounded-full" aria-hidden>
            {PERSPECTIVES.map((p) => (
              <motion.div
                key={p.key}
                className="h-full"
                style={{ background: p.color }}
                animate={{ width: `${weights[p.key] * SAMPLE_SCORES[p.key] * 100}%` }}
                transition={{ type: "spring", stiffness: 160, damping: 24 }}
              />
            ))}
          </div>
        </div>

        <div
          className="bg-card rounded-xl p-4 font-mono text-xs leading-relaxed sm:text-[13px]"
          aria-live="polite"
        >
          <p className="text-muted-foreground">Final =</p>
          {PERSPECTIVES.map((p, i) => (
            <p key={p.key}>
              <span style={{ color: p.color }}>{formatScore(weights[p.key])}</span>·
              {formatScore(SAMPLE_SCORES[p.key])}{" "}
              <span className="text-muted-foreground">({p.name.toLowerCase()})</span>
              {i < PERSPECTIVES.length - 1 ? " +" : ""}
            </p>
          ))}
          <p className="mt-1 font-semibold">= {formatScore(final)}</p>
        </div>

        <Badge variant="default" className="self-start whitespace-normal">
          <FlaskConical aria-hidden />
          Weights are experimental and evaluated against human judgment.
        </Badge>
      </div>
    </div>
  );
}
