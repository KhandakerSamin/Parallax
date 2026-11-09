"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ExternalLink,
  FileSearch,
  Languages,
  Layers,
  RotateCcw,
  ShieldCheck,
  Type,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Evidence, Match, SavedAnalysis, SimilarityLevel } from "@/lib/analysis/types";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const pct = (value: number) => `${Math.round(value * 100)}%`;

const LEVELS: Record<SimilarityLevel, { label: string; hint: string; className: string }> = {
  low: {
    label: "Low",
    hint: "Little overlap with the corpus. Nothing stands out for review.",
    className: "bg-accent-soft text-accent",
  },
  moderate: {
    label: "Moderate",
    hint: "Some passages closely resemble earlier reports. Worth a look.",
    className: "bg-lexical-soft text-lexical",
  },
  high: {
    label: "High",
    hint: "A large share closely resembles earlier work. A reviewer should examine the evidence.",
    className: "bg-danger/10 text-danger",
  },
};

const FLAGS: Record<string, string> = {
  little_text: "Very little readable text: it may be a scanned PDF",
  legacy_bangla_font:
    "Uses an older Bangla font (e.g. SutonnyMJ), so Bangla text may not compare well",
  no_structure: "No chapters or sections were detected",
  no_abstract: "No abstract was found",
  no_references: "No references section was found",
};

const LANGUAGES: Record<string, string> = {
  en: "English",
  bn: "Bangla",
  mixed: "Bangla + English",
};

/** Circular gauge for the overall score, as a percentage. */
function OverallRing({ value }: { value: number }) {
  const size = 132;
  const stroke = 10;
  const r = (size - stroke) / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="report-ring" x1="0" y1="0" x2="1" y2="1">
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
          stroke="url(#report-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(value, 0.005) }}
          transition={{ duration: 1.4, delay: 0.2, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{pct(value)}</span>
        <span className="text-muted-foreground text-xs">Overall</span>
      </div>
    </div>
  );
}

function Meter({
  label,
  value,
  color,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number;
  color: string;
  icon: typeof Type;
  hint: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="size-4" style={{ color }} aria-hidden />
          {label}
        </span>
        <span className="font-mono tabular-nums">{pct(value)}</span>
      </div>
      <div
        className="bg-muted h-2 overflow-hidden rounded-full"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
      >
        <motion.div
          className="h-full origin-left rounded-full"
          style={{ background: color }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: value }}
          transition={{ duration: 1, delay: 0.3, ease: EASE }}
        />
      </div>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </div>
  );
}

function EvidenceRow({ evidence, sourceTitle }: { evidence: Evidence; sourceTitle: string }) {
  const lexical = evidence.perspective === "lexical";
  return (
    <li className="border-border rounded-2xl border p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant={lexical ? "lexical" : "semantic"}>
          {lexical ? "Same wording" : "Similar meaning"}
        </Badge>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {lexical ? "overlap" : "similarity"} {pct(evidence.score)}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          { label: "Your text", excerpt: evidence.submitted, tone: "bg-muted/50" },
          {
            label: sourceTitle,
            excerpt: evidence.source,
            tone: lexical ? "bg-lexical-soft" : "bg-semantic-soft",
          },
        ].map(({ label, excerpt, tone }) => (
          <figure key={label} className={cn("min-w-0 rounded-xl p-3.5", tone)}>
            <figcaption className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs">
              <span className="text-foreground truncate font-medium">{label}</span>
              {excerpt.section && <span className="truncate">· {excerpt.section}</span>}
            </figcaption>
            <blockquote className="text-sm leading-relaxed">{excerpt.text}</blockquote>
          </figure>
        ))}
      </div>
    </li>
  );
}

function MatchCard({ match, rank }: { match: Match; rank: number }) {
  const [open, setOpen] = useState(rank === 1);
  const { source } = match;
  const meta = [source.authors.slice(0, 3).join(", "), source.year, source.type].filter(Boolean);
  const panelId = `match-${source.id}`;

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(rank, 6) * 0.05, ease: EASE }}
      className="border-border bg-card shadow-soft overflow-hidden rounded-2xl border"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="hover:bg-muted/40 flex w-full items-start gap-4 p-4 text-left transition-colors sm:p-5"
      >
        <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-lg text-sm font-semibold">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-balance">{source.title}</p>
          {meta.length > 0 && (
            <p className="text-muted-foreground mt-0.5 truncate text-sm">{meta.join(" · ")}</p>
          )}
          <div className="mt-3 grid max-w-md grid-cols-2 gap-x-5 gap-y-1 text-xs">
            {[
              { label: "Wording", value: match.scores.lexical, color: "var(--lexical)" },
              { label: "Meaning", value: match.scores.semantic, color: "var(--semantic)" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-muted-foreground mb-1 flex justify-between">
                  <span>{s.label}</span>
                  <span className="tabular-nums">{pct(s.value)}</span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{ width: pct(s.value), background: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-xl font-semibold tabular-nums">{pct(match.overall)}</span>
          <ChevronDown
            className={cn(
              "text-muted-foreground size-4 transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-border space-y-3 border-t p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {match.evidence.length} matching passage{match.evidence.length === 1 ? "" : "s"}
                </p>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand inline-flex items-center gap-1 text-sm font-medium hover:underline"
                  >
                    Open in DIU repository
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
              </div>
              {match.evidence.length > 0 ? (
                <ul className="space-y-3">
                  {match.evidence.map((e, i) => (
                    <EvidenceRow key={i} evidence={e} sourceTitle="Source" />
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  The overlap is spread thinly, so there are no single passages to show.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/** The similarity report: summary, document facts, and each source with its evidence. */
export function ReportView({ saved, onReset }: { saved: SavedAnalysis; onReset: () => void }) {
  const { result, sourceName, analyzedAt } = saved;
  const { summary, document, matches } = result;
  const level = LEVELS[summary.level];
  const corpusSize = result.corpus.documents;

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        aria-labelledby="report-title"
        className="border-border bg-card shadow-soft relative overflow-hidden rounded-3xl border p-6 sm:p-8"
      >
        <div
          aria-hidden
          className="absolute -top-24 -right-20 size-72 rounded-full bg-[#4f46e5] opacity-10 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm">Similarity report</p>
            <h1
              id="report-title"
              className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {document.title || sourceName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Analyzed {new Date(analyzedAt).toLocaleString()}
              {corpusSize ? ` · compared with ${corpusSize} DIU reports` : ""}
            </p>
          </div>
          <Button variant="outline" onClick={onReset} className="shrink-0">
            <RotateCcw aria-hidden />
            Analyze another
          </Button>
        </div>

        <div className="relative mt-8 grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-5">
            <OverallRing value={summary.overall} />
            <div>
              <span
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-sm font-semibold",
                  level.className,
                )}
              >
                {level.label} potential similarity
              </span>
              <p className="text-muted-foreground mt-2 max-w-56 text-sm">{level.hint}</p>
            </div>
          </div>
          <div className="space-y-5">
            <Meter
              label="Same wording"
              value={summary.lexical_coverage}
              color="var(--lexical)"
              icon={Type}
              hint="Share of your text in sentences that reuse a source's wording."
            />
            <Meter
              label="Similar meaning"
              value={summary.semantic_coverage}
              color="var(--semantic)"
              icon={Languages}
              hint="Share of your text closely paraphrased or translated from a source."
            />
          </div>
        </div>

        <dl className="border-border relative mt-8 grid grid-cols-2 gap-4 border-t pt-6 sm:grid-cols-4">
          {[
            { icon: BookOpen, label: "Words", value: document.words.toLocaleString() },
            { icon: Layers, label: "Passages compared", value: document.passages.toLocaleString() },
            {
              icon: Languages,
              label: "Language",
              value: LANGUAGES[document.language] ?? document.language,
            },
            { icon: FileSearch, label: "Sources found", value: String(matches.length) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="min-w-0">
              <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Icon className="size-3.5" aria-hidden />
                {label}
              </dt>
              <dd className="mt-1 truncate font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        {(document.flags.length > 0 || result.notes.length > 0) && (
          <ul className="relative mt-6 space-y-2">
            {[...document.flags.map((f) => FLAGS[f] ?? f), ...result.notes].map((note) => (
              <li
                key={note}
                className="bg-lexical-soft text-foreground flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm"
              >
                <AlertTriangle className="text-lexical mt-0.5 size-4 shrink-0" aria-hidden />
                {note}
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      <section aria-labelledby="sources-title" className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <h2 id="sources-title" className="text-lg font-semibold">
            Similar reports
          </h2>
          {matches.length > 0 && (
            <p className="text-muted-foreground text-xs">
              Select a report to see the matching passages
            </p>
          )}
        </div>
        {matches.length > 0 ? (
          <ol className="space-y-3">
            {matches.map((m, i) => (
              <MatchCard key={m.source.id} match={m} rank={i + 1} />
            ))}
          </ol>
        ) : (
          <div className="border-input bg-card/60 rounded-2xl border border-dashed p-8 text-center">
            <ShieldCheck className="text-accent mx-auto size-8" aria-hidden />
            <p className="mt-3 font-medium">No similar reports found</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Nothing in the corpus resembles this text closely enough to show.
            </p>
          </div>
        )}
      </section>

      <p className="text-muted-foreground flex items-start gap-2 px-1 text-xs">
        <ShieldCheck className="text-accent mt-0.5 size-3.5 shrink-0" aria-hidden />
        These results show potential similarity, never a verdict. Shared topics, standard methods
        and properly cited text can all appear here. A reviewer makes the final call.
      </p>
    </div>
  );
}
