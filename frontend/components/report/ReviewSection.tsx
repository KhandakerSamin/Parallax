"use client";

import { CheckCircle2, ChevronDown, CircleAlert, Clock3, Loader2 } from "lucide-react";
import { forwardRef, useState } from "react";
import { toast } from "sonner";
import { DecisionChip, Panel } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { recordReview } from "@/lib/analysis/api";
import {
  AnalysisError,
  type ReportSummary,
  type ReviewStatus,
  type SavedReport,
} from "@/lib/analysis/types";
import { formatDate, langProps } from "@/lib/app/format";
import { CORPUS, DECISIONS } from "@/lib/app/terms";
import { cn } from "@/lib/utils";

const OPTIONS: { status: ReviewStatus; icon: typeof Clock3 }[] = [
  { status: "pending", icon: Clock3 },
  { status: "cleared", icon: CheckCircle2 },
  { status: "follow_up", icon: CircleAlert },
];

/** Reviewers record a decision; the score never decides. */
export const ReviewPanel = forwardRef<
  HTMLTextAreaElement,
  { report: ReportSummary; onSaved: (saved: SavedReport) => void; className?: string }
>(function ReviewPanel({ report, onSaved, className }, noteRef) {
  const [status, setStatus] = useState<ReviewStatus>(report.reviewStatus ?? "pending");
  const [note, setNote] = useState(report.reviewNote ?? "");
  const [saving, setSaving] = useState(false);
  const changed =
    status !== (report.reviewStatus ?? "pending") || note !== (report.reviewNote ?? "");

  async function save() {
    setSaving(true);
    try {
      const saved = await recordReview(report.id, status, note);
      onSaved(saved);
      toast.success("Decision saved");
    } catch (err) {
      toast.error(err instanceof AnalysisError ? err.message : "Couldn't save the decision.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      id="review"
      title="Reviewer decision"
      description="Read the evidence, then record what you found."
      className={cn("scroll-mt-24", className)}
    >
      <fieldset>
        <legend className="sr-only">Decision</legend>
        <div className="grid gap-2" role="radiogroup">
          {OPTIONS.map(({ status: value, icon: Icon }) => {
            const active = status === value;
            return (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors",
                  active
                    ? "border-primary/50 bg-semantic-soft/50"
                    : "border-border hover:bg-muted/60",
                )}
              >
                <input
                  type="radio"
                  name="decision"
                  value={value}
                  checked={active}
                  onChange={() => setStatus(value)}
                  className="sr-only"
                />
                <Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    active ? "text-brand" : "text-muted-foreground",
                  )}
                  aria-hidden
                />
                <span>
                  <span className="block text-sm font-medium">{DECISIONS[value].label}</span>
                  <span className="text-muted-foreground block text-xs">
                    {DECISIONS[value].meaning}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <label htmlFor="review-note" className="mt-4 mb-1.5 block text-sm font-medium">
        Note{" "}
        <span className="text-muted-foreground font-normal">(optional, the student sees it)</span>
      </label>
      <textarea
        id="review-note"
        ref={noteRef}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="e.g. The matching passages in Chapter 2 are properly cited."
        className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-y rounded-xl border px-3.5 py-3 text-sm outline-none focus-visible:ring-2"
      />
      <Button className="mt-3 w-full" onClick={save} disabled={saving || !changed}>
        {saving && <Loader2 className="animate-spin" aria-hidden />}
        Save decision
      </Button>
      {report.reviewedAt && (
        <p className="text-muted-foreground mt-3 text-xs">
          Last updated{report.reviewerName ? ` by ${report.reviewerName}` : ""} on{" "}
          {formatDate(report.reviewedAt)}
        </p>
      )}
    </Panel>
  );
});

/** What the owner sees: the decision, the note and the date. */
export function DecisionCard({ report }: { report: ReportSummary }) {
  const status = report.reviewStatus ?? "pending";
  return (
    <Panel title="Reviewer decision">
      <DecisionChip status={status} />
      <p className="text-muted-foreground mt-2 text-sm">{DECISIONS[status].meaning}</p>
      {report.reviewNote && (
        <blockquote
          {...langProps(report.reviewNote)}
          className="bn-aware border-border mt-3 border-l-2 pl-3 text-sm"
        >
          {report.reviewNote}
        </blockquote>
      )}
      {report.reviewedAt && (
        <p className="text-muted-foreground mt-3 text-xs">
          {report.reviewerName ? `${report.reviewerName} · ` : ""}
          {formatDate(report.reviewedAt)}
        </p>
      )}
      {status === "pending" && (
        <p className="text-muted-foreground mt-3 text-xs">
          A reviewer will look at this report. Similarity alone doesn&apos;t mean misconduct.
        </p>
      )}
    </Panel>
  );
}

/** Plain-language guidance for reading the report. */
export function InterpretationPanel() {
  return (
    <details
      className="group border-border bg-card rounded-2xl border shadow-xs"
      data-print-avoid-break
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="text-base font-semibold tracking-tight">What this report means</span>
        <ChevronDown
          className="text-muted-foreground size-4 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="grid gap-6 px-5 pb-6 text-sm sm:px-6 md:grid-cols-3">
        <div>
          <h3 className="font-medium">Common, legitimate reasons for similarity</h3>
          <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4">
            <li>The same topic or project idea, written independently</li>
            <li>A standard method, algorithm or tool described the usual way</li>
            <li>A source that is properly quoted and cited</li>
            <li>The shared DIU report template (Parallax already removes most of it)</li>
          </ul>
        </div>
        <div>
          <h3 className="font-medium">What a reviewer looks at</h3>
          <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4">
            <li>Whether matching passages are cited</li>
            <li>How much of the report the matches cover, and where</li>
            <li>Whether a match is wording (lexical) or meaning (semantic)</li>
            <li>Whether shared terms are just the vocabulary of the field</li>
          </ul>
        </div>
        <div>
          <h3 className="font-medium">Limits</h3>
          <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4">
            <li>
              The corpus is {CORPUS.reports.toLocaleString()} {CORPUS.scope} only
            </li>
            <li>Scanned pages (pictures of text) can&apos;t be read yet</li>
            <li>Cross-language matches should always be read by a person</li>
            <li>A high score is not proof of copying</li>
          </ul>
        </div>
      </div>
    </details>
  );
}
