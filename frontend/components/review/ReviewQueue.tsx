"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, FileText, Gavel, ShieldCheck, Type } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { listReviewQueue } from "@/lib/analysis/api";
import {
  AnalysisError,
  REVIEW_LABELS,
  type ReportSummary,
  type ReviewStatus,
  type SimilarityLevel,
} from "@/lib/analysis/types";
import { isReviewer } from "@/lib/auth/types";
import { cn } from "@/lib/utils";
import { ReviewStatusBadge } from "./ReviewStatusBadge";

const LEVEL_STYLE: Record<SimilarityLevel, string> = {
  low: "bg-accent-soft text-accent",
  moderate: "bg-lexical-soft text-lexical",
  high: "bg-danger/10 text-danger",
};

const STATUS_TABS: { value: ReviewStatus | "all"; label: string }[] = [
  { value: "pending", label: REVIEW_LABELS.pending },
  { value: "follow_up", label: REVIEW_LABELS.follow_up },
  { value: "cleared", label: REVIEW_LABELS.cleared },
  { value: "all", label: "All" },
];

const LEVELS: { value: SimilarityLevel | "all"; label: string }[] = [
  { value: "all", label: "Any level" },
  { value: "high", label: "High" },
  { value: "moderate", label: "Moderate" },
  { value: "low", label: "Low" },
];

const pct = (value: number) => `${Math.round(value * 100)}%`;

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; reports: ReportSummary[] };

/** /dashboard/reviews: every student's reports for reviewers, undecided and most similar first. */
export function ReviewQueue() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<ReviewStatus | "all">("pending");
  const [level, setLevel] = useState<SimilarityLevel | "all">("all");
  const [state, setState] = useState<State>({ status: "loading" });

  // Students who open this URL go back to their dashboard; the backend refuses them anyway.
  useEffect(() => {
    if (authStatus === "authenticated" && !isReviewer(user?.role)) router.replace("/dashboard");
  }, [authStatus, user, router]);

  useEffect(() => {
    if (!isReviewer(user?.role)) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });
    listReviewQueue({
      status: tab === "all" ? undefined : tab,
      level: level === "all" ? undefined : level,
    })
      .then((reports) => !cancelled && setState({ status: "ready", reports }))
      .catch(
        (err) =>
          !cancelled &&
          setState({
            status: "error",
            message: err instanceof AnalysisError ? err.message : "Couldn't load the review queue.",
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [tab, level, user]);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Dashboard
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="border-border bg-card shadow-soft rounded-3xl border p-6 sm:p-8"
        aria-labelledby="queue-title"
      >
        <div className="flex items-center gap-3">
          <span className="bg-semantic-soft text-brand grid size-11 place-items-center rounded-xl">
            <Gavel className="size-5" aria-hidden />
          </span>
          <div>
            <h1 id="queue-title" className="text-2xl font-semibold tracking-tight">
              Review queue
            </h1>
            <p className="text-muted-foreground text-sm">
              Students&apos; reports, undecided and most similar first. Open one to read the
              evidence and record a decision.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Review status"
            className="bg-muted inline-flex flex-wrap gap-1 rounded-xl p-1"
          >
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                role="tab"
                type="button"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === t.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            Level
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as SimilarityLevel | "all")}
              className="border-input bg-background text-foreground focus-visible:ring-ring rounded-lg border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6">
          {state.status === "loading" && (
            <ul className="space-y-2" aria-busy="true" aria-label="Loading reports">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="bg-muted h-16 animate-pulse rounded-xl" />
              ))}
            </ul>
          )}
          {state.status === "error" && (
            <p role="alert" className="text-muted-foreground text-sm">
              {state.message}
            </p>
          )}
          {state.status === "ready" && state.reports.length === 0 && (
            <div className="py-10 text-center">
              <ShieldCheck className="text-accent mx-auto size-8" aria-hidden />
              <p className="mt-3 font-medium">Nothing here</p>
              <p className="text-muted-foreground text-sm">No reports match these filters.</p>
            </div>
          )}
          {state.status === "ready" && state.reports.length > 0 && (
            <ul className="space-y-2">
              {state.reports.map((report, i) => {
                const Icon = report.sourceKind === "pdf" ? FileText : Type;
                return (
                  <motion.li
                    key={report.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.03 }}
                  >
                    <Link
                      href={`/dashboard/reports/${report.id}`}
                      className="group border-border hover:bg-muted/50 flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors"
                    >
                      <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{report.title}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {report.ownerName ?? "Unknown"}
                          {report.ownerUniversityId && ` · ${report.ownerUniversityId}`} ·{" "}
                          {new Date(report.createdAt).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                          })}
                          {report.topSourceTitle && ` · closest: ${report.topSourceTitle}`}
                        </p>
                      </div>
                      <ReviewStatusBadge
                        status={report.reviewStatus}
                        className="hidden sm:inline-flex"
                      />
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
      </motion.section>
    </div>
  );
}
