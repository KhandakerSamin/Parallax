"use client";

import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

export function LexicalVisual() {
  const words = [
    { w: "attendance", shared: true },
    { w: "webcam", shared: true },
    { w: "students", shared: false },
    { w: "face", shared: true },
    { w: "database", shared: false },
    { w: "recognition", shared: true },
    { w: "classroom", shared: false },
  ];
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Keyword overlap example">
      {words.map(({ w, shared }, i) => (
        <motion.li
          key={w}
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05, duration: 0.4 }}
          className={
            shared
              ? "rounded-md bg-lexical-soft px-2 py-1 font-mono text-xs text-lexical"
              : "rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
          }
        >
          {w}
          {shared && <span className="sr-only"> (shared)</span>}
        </motion.li>
      ))}
    </ul>
  );
}

export function SemanticVisual() {
  // Points start scattered and settle into two clusters: similar meaning ends up close together.
  const points = [
    { from: [12, 18], to: [30, 42], c: "var(--semantic)" },
    { from: [80, 14], to: [36, 50], c: "var(--semantic)" },
    { from: [50, 80], to: [28, 54], c: "var(--semantic)" },
    { from: [20, 70], to: [40, 38], c: "var(--semantic)" },
    { from: [70, 60], to: [76, 26], c: "var(--muted-foreground)" },
    { from: [40, 30], to: [82, 34], c: "var(--muted-foreground)" },
  ];
  return (
    <svg viewBox="0 0 100 70" className="h-28 w-full" role="img" aria-label="Similar meanings cluster together in embedding space">
      <circle cx="34" cy="46" r="17" fill="var(--semantic-soft)" />
      {points.map((p, i) => (
        <motion.circle
          key={i}
          r="3.2"
          fill={p.c}
          initial={{ cx: p.from[0], cy: p.from[1] }}
          whileInView={{ cx: p.to[0], cy: p.to[1] }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, delay: 0.2 + i * 0.06, ease: EASE }}
        />
      ))}
    </svg>
  );
}

export function ConceptVisual() {
  const fields = [
    ["Domain", "Education", true],
    ["Problem", "Attendance tracking", true],
    ["Method", "Face recognition", true],
    ["Platform", "Web vs Mobile", false],
  ] as const;
  return (
    <dl className="space-y-1.5 text-xs">
      {fields.map(([k, v, match]) => (
        <div key={k} className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5">
          <dt className="w-16 shrink-0 text-muted-foreground">{k}</dt>
          <dd className="flex-1 truncate">{v}</dd>
          {match ? (
            <Check className="size-3.5 text-concept" strokeWidth={3} aria-label="match" />
          ) : (
            <Minus className="size-3.5 text-muted-foreground" aria-label="different" />
          )}
        </div>
      ))}
    </dl>
  );
}

export function StructuralVisual() {
  const box = "fill-[var(--card)] stroke-[var(--structural)]";
  return (
    <svg viewBox="0 0 220 96" className="h-28 w-full" role="img" aria-label="Architecture: web client to REST API to ML service, with database and dashboard">
      <defs>
        <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 8 4 0 8z" fill="var(--structural)" />
        </marker>
      </defs>
      {[
        [4, 8, "Web Client"],
        [80, 8, "REST API"],
        [156, 8, "ML Service"],
        [80, 62, "Database"],
        [156, 62, "Dashboard"],
      ].map(([x, y, label]) => (
        <g key={label as string}>
          <rect x={x as number} y={y as number} width="60" height="26" rx="7" className={box} strokeWidth="1.5" />
          <text x={(x as number) + 30} y={(y as number) + 17} textAnchor="middle" className="fill-[var(--foreground)] text-[9px]">
            {label}
          </text>
        </g>
      ))}
      {[
        "M64 21h14",
        "M140 21h14",
        "M110 34v26",
        "M186 34v26",
      ].map((d, i) => (
        <motion.path
          key={d}
          d={d}
          stroke="var(--structural)"
          strokeWidth="1.5"
          fill="none"
          markerEnd="url(#arrow)"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
        />
      ))}
    </svg>
  );
}
