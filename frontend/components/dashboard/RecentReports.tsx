"use client";

import { motion } from "framer-motion";
import { ChevronRight, FileText, History, Type } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listReports } from "@/lib/analysis/api";
import { AnalysisError, type ReportSummary, type SimilarityLevel } from "@/lib/analysis/types";
import { cn } from "@/lib/utils";
import { ReviewStatusBadge } from "@/components/review/ReviewStatusBadge";

const LEVEL_STYLE: Record<SimilarityLevel, string> = {
  low: "bg-accent-soft text-accent",
  moderate: "bg-lexical-soft text-lexical",
  high: "bg-danger/10 text-danger",
};

const pct = (value: number) => `${Math.round(value * 100)}%`;

function when(iso: string): string {
  const date = new Date(iso);
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; reports: ReportSummary[] };

/** The signed-in user's saved reports, newest first, each linking to its full report. */
export function RecentReports({ limit = 6 }: { limit?: number }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    listReports()
      .then((reports) => !cancelled && setState({ status: "ready", reports }))
      .catch(
        (err) =>
          !cancelled &&
          setState({
            status: "error",
            message: err instanceof AnalysisError ? err.message : "Couldn't load your reports.",
          }),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="bg-concept-soft text-concept grid size-11 place-items-center rounded-xl">
          <History className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Recent reports</h2>
          {state.status === "ready" && state.reports.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {state.reports.length} saved report{state.reports.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {state.status === "loading" && (
        <ul className="mt-5 space-y-2" aria-busy="true" aria-label="Loading reports">
          {[0, 1, 2].map((i) => (
            <li key={i} className="bg-muted h-14 animate-pulse rounded-xl" />
          ))}
        </ul>
      )}

      {state.status === "error" && (
        <p className="text-muted-foreground mt-5 text-sm" role="alert">
          {state.message}
        </p>
      )}

      {state.status === "ready" && state.reports.length === 0 && (
        <p className="text-muted-foreground mt-5 text-sm">
          No reports yet. Analyze a document and its report will be saved here.
        </p>
      )}

      {state.status === "ready" && state.reports.length > 0 && (
        <ul className="mt-5 space-y-2">
          {state.reports.slice(0, limit).map((report, i) => {
            const Icon = report.sourceKind === "pdf" ? FileText : Type;
            return (
              <motion.li
                key={report.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Link
                  href={`/dashboard/reports/${report.id}`}
                  className="group hover:bg-muted/60 border-border flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors"
                >
                  <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{report.title}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {when(report.createdAt)}
                      {report.topSourceTitle
                        ? ` · closest: ${report.topSourceTitle}`
                        : " · no similar reports"}
                    </p>
                  </div>
                  {report.reviewStatus && report.reviewStatus !== "pending" && (
                    <ReviewStatusBadge
                      status={report.reviewStatus}
                      className="hidden sm:inline-flex"
                    />
                  )}
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                      LEVEL_STYLE[report.level],
                    )}
                    title={`${report.level} potential similarity`}
                  >
                    {pct(report.overall)}
                  </span>
                  <ChevronRight
                    className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
