"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Rough timings (seconds) for a full report on a CPU; only drives the visual steps. */
const PDF_STEPS = [
  { label: "Reading the PDF and finding its sections", at: 0 },
  { label: "Removing template pages and boilerplate", at: 3 },
  { label: "Embedding passages with LaBSE", at: 6 },
  { label: "Searching 32,000+ corpus passages", at: 18 },
  { label: "Checking wording and building evidence", at: 26 },
];
const TEXT_STEPS = [
  { label: "Splitting the text into passages", at: 0 },
  { label: "Embedding passages with LaBSE", at: 1 },
  { label: "Searching the corpus", at: 3 },
  { label: "Checking wording and building evidence", at: 5 },
];

/** Shown while the analysis runs: elapsed time and the pipeline's steps. */
export function AnalysisProgress({ mode }: { mode: "pdf" | "text" }) {
  const steps = mode === "pdf" ? PDF_STEPS : TEXT_STEPS;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed((Date.now() - started) / 1000), 250);
    return () => clearInterval(timer);
  }, []);

  const current = steps.reduce((acc, step, i) => (elapsed >= step.at ? i : acc), 0);

  return (
    <div
      className="border-border bg-card rounded-2xl border p-6 sm:p-8"
      role="status"
      aria-live="polite"
      aria-label="Analysis in progress"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Analyzing…</p>
          <p className="text-muted-foreground text-sm">
            {mode === "pdf"
              ? "A full report usually takes 20–40 seconds."
              : "This usually takes a few seconds."}
          </p>
        </div>
        <span className="text-muted-foreground font-mono text-sm tabular-nums">
          {Math.floor(elapsed)}s
        </span>
      </div>

      <div className="bg-muted mt-5 h-1.5 overflow-hidden rounded-full">
        <motion.div
          className="via-primary h-full w-1/3 rounded-full bg-gradient-to-r from-[var(--lexical)] to-[var(--concept)]"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <ol className="mt-6 space-y-3">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={step.label}
              className={cn(
                "flex items-center gap-3 text-sm transition-colors",
                done || active ? "text-foreground" : "text-muted-foreground/60",
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border",
                  done && "bg-accent border-transparent text-white",
                  active && "border-primary text-brand",
                )}
              >
                {done ? (
                  <Check className="size-3.5" aria-hidden />
                ) : active ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <span className="text-[10px]">{i + 1}</span>
                )}
              </span>
              {step.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
