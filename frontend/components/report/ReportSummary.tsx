"use client";

import { Check, Copy, Download, Gavel, Loader2, Printer, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScoreRing } from "@/components/app/charts";
import { DecisionChip, LevelBadge, SourceKindChip } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadReportPdf, printReportPdf } from "@/lib/analysis/api";
import { AnalysisError, type Match, type SavedReport } from "@/lib/analysis/types";
import { formatDate, langProps, pct, shortId } from "@/lib/app/format";
import { PERSPECTIVES, type PerspectiveKey } from "@/lib/app/terms";
import { cn } from "@/lib/utils";

export function topMatch(matches: Match[]): Match | null {
  return [...matches].sort((a, b) => (b.hybrid ?? b.overall) - (a.hybrid ?? a.overall))[0] ?? null;
}

function scoreOf(match: Match, key: PerspectiveKey): number {
  return match.scores[key] ?? 0;
}

// ----- Header ----------------------------------------------------------------

export function ReportHeader({
  saved,
  ownerLabel,
  canDelete,
  canReview,
  onDelete,
  onJumpToReview,
}: {
  saved: SavedReport;
  ownerLabel: string;
  canDelete: boolean;
  canReview: boolean;
  onDelete: () => void;
  onJumpToReview: () => void;
}) {
  const { report } = saved;
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      await downloadReportPdf(report.id);
    } catch (err) {
      toast.error(err instanceof AnalysisError ? err.message : "The PDF could not be created.");
    } finally {
      setDownloading(false);
    }
  }

  // Ctrl+P / Cmd+P on a report prints the same PDF as the Print button.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        printReportPdf(report.id).catch((err: unknown) =>
          toast.error(err instanceof AnalysisError ? err.message : "The PDF could not be created."),
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [report.id]);

  async function print() {
    setPrinting(true);
    try {
      await printReportPdf(report.id);
    } catch (err) {
      toast.error(err instanceof AnalysisError ? err.message : "The PDF could not be created.");
    } finally {
      setPrinting(false);
    }
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(report.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the report ID.");
    }
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <p className="text-brand text-xs font-semibold tracking-wide uppercase">
          Similarity report
        </p>
        <h1
          {...langProps(report.title)}
          className="bn-aware mt-1.5 text-2xl font-semibold tracking-tight text-balance break-words sm:text-[1.9rem]"
        >
          {report.title}
        </h1>
        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <SourceKindChip kind={report.sourceKind} />
          <span>{formatDate(report.createdAt)}</span>
          <span aria-hidden>·</span>
          <span>{ownerLabel}</span>
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={copyId}
            className="hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 font-mono text-xs"
            aria-label={`Copy report ID ${report.id}`}
          >
            ID {shortId(report.id)}
            {copied ? (
              <Check className="text-success size-3.5" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
          </button>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 print:hidden">
        <Button onClick={download} disabled={downloading}>
          {downloading ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Download aria-hidden />
          )}
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </Button>
        <Button variant="outline" onClick={print} disabled={printing}>
          {printing ? <Loader2 className="animate-spin" aria-hidden /> : <Printer aria-hidden />}
          {printing ? "Preparing…" : "Print"}
        </Button>
        {canReview && (
          <Button variant="outline" onClick={onJumpToReview}>
            <Gavel aria-hidden />
            Jump to review
          </Button>
        )}
        {canDelete && (
          <Button variant="outline" onClick={onDelete} className="text-danger hover:bg-danger/10">
            <Trash2 aria-hidden />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

// ----- Summary band ----------------------------------------------------------

export function SummaryBand({
  saved,
  isOwnerStudent,
}: {
  saved: SavedReport;
  isOwnerStudent: boolean;
}) {
  const { report, result } = saved;
  const level = result.summary.level;
  const top = topMatch(result.matches);
  const strongest = top
    ? PERSPECTIVES.reduce((best, p) => (scoreOf(top, p.key) > scoreOf(top, best.key) ? p : best))
    : null;
  const detail = top ? [top.source.year, top.source.type].filter(Boolean).join(" · ") : "";

  return (
    <section
      aria-label="Summary"
      className="border-border relative overflow-hidden rounded-3xl border"
      data-print-avoid-break
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(60% 90% at 0% 0%, var(--semantic-soft), transparent 70%), radial-gradient(50% 80% at 100% 100%, var(--concept-soft), transparent 70%), var(--card)",
        }}
      />
      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[auto_1fr_1fr] lg:gap-8">
        {/* 1. Overall score */}
        <div className="flex items-center gap-5 lg:flex-col lg:items-center lg:text-center">
          <ScoreRing value={result.summary.overall} level={level} />
          <div className="max-w-56 space-y-2.5">
            <LevelBadge level={level} size="lg" />
            <p className="text-muted-foreground text-sm">
              of your text closely matches earlier DIU reports, by wording or meaning.
            </p>
          </div>
        </div>

        {/* 2. Key facts */}
        <dl className="grid content-start gap-4 text-sm lg:border-l lg:pl-8">
          <div>
            <dt className="text-muted-foreground text-xs">Matching source reports</dt>
            <dd className="mt-0.5 text-2xl font-semibold tabular-nums">{result.matches.length}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Closest source</dt>
            <dd {...langProps(top?.source.title)} className="bn-aware mt-0.5 font-medium">
              {top ? top.source.title : "No similar report found"}
              {detail && <span className="text-muted-foreground font-normal"> · {detail}</span>}
            </dd>
          </div>
          {top && strongest && (
            <div>
              <dt className="text-muted-foreground text-xs">
                Strongest perspective for that source
              </dt>
              <dd className="mt-0.5 flex items-center gap-2 font-medium">
                <strongest.icon className="size-4" style={{ color: strongest.color }} aria-hidden />
                {strongest.name} · {pct(scoreOf(top, strongest.key))}
              </dd>
            </div>
          )}
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <ShieldCheck className="text-success size-4" aria-hidden />
            DIU cover pages and template text ignored
          </div>
        </dl>

        {/* 3. Review status */}
        <div className="grid content-start gap-3 text-sm lg:border-l lg:pl-8">
          <p className="text-muted-foreground text-xs">Reviewer decision</p>
          <div>
            <DecisionChip status={report.reviewStatus} />
          </div>
          {report.reviewNote && (
            <p {...langProps(report.reviewNote)} className="bn-aware clamp-3">
              “{report.reviewNote}”
            </p>
          )}
          {report.reviewedAt && (
            <p className="text-muted-foreground text-xs">
              {report.reviewerName ? `${report.reviewerName} · ` : ""}
              {formatDate(report.reviewedAt)}
            </p>
          )}
          {isOwnerStudent && (report.reviewStatus ?? "pending") === "pending" && (
            <p className="text-muted-foreground text-xs">
              A reviewer will look at this report. Similarity alone doesn&apos;t mean misconduct.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// ----- Perspective overview --------------------------------------------------

export function PerspectiveTiles({
  match,
  narrow = false,
}: {
  match: Match | null;
  narrow?: boolean;
}) {
  return (
    <section aria-labelledby="perspectives-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="perspectives-title" className="text-base font-semibold tracking-tight">
          Four perspectives
        </h2>
        <p className="text-muted-foreground text-xs">
          {match ? "Scores against the closest source" : "No source to compare against"}
        </p>
      </div>
      <div
        className={cn("grid gap-3 sm:grid-cols-2", narrow ? "2xl:grid-cols-4" : "xl:grid-cols-4")}
      >
        {PERSPECTIVES.map((p, i) => {
          const value = match ? scoreOf(match, p.key) : 0;
          return (
            <Tooltip key={p.key}>
              <TooltipTrigger asChild>
                <div
                  tabIndex={0}
                  className="border-border bg-card focus-visible:border-primary/50 rounded-2xl border p-4 shadow-xs outline-none"
                  style={{ boxShadow: `inset 0 3px 0 0 ${p.color}` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span
                        className="grid size-7 place-items-center rounded-lg"
                        style={{ background: p.soft, color: p.color }}
                      >
                        <p.icon className="size-4" aria-hidden />
                      </span>
                      {p.name}
                    </span>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      weight {Math.round(p.weight * 100)}%
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-2 min-h-10 text-xs">{p.question}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{pct(value)}</p>
                  <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-700 ease-out")}
                      style={{
                        width: `${Math.round(value * 100)}%`,
                        background: p.color,
                        transitionDelay: `${i * 60}ms`,
                      }}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>{p.method}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </section>
  );
}
