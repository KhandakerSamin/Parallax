"use client";

import { motion } from "framer-motion";
import { CountUp } from "@/components/motion/CountUp";

type ScoreRingProps = { value: number; size?: number; label?: string };

/** Circular gauge that fills to `value` (0–1) with a counting number in the middle. */
export function ScoreRing({ value, size = 112, label = "Overall" }: ScoreRingProps) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#14b8a6" />
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
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: value }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp value={value} decimals={2} className="text-2xl font-semibold tracking-tight" />
        <span className="text-muted-foreground text-[11px]">{label}</span>
      </div>
    </div>
  );
}
