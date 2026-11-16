"use client";

import { CheckCircle2, Clock, Gavel, Loader2, MessageSquareWarning } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { recordReview } from "@/lib/analysis/api";
import {
  AnalysisError,
  REVIEW_LABELS,
  type ReportSummary,
  type ReviewStatus,
} from "@/lib/analysis/types";
import { cn } from "@/lib/utils";
import { ReviewStatusBadge } from "./ReviewStatusBadge";

const CHOICES: { status: ReviewStatus; icon: typeof Clock; hint: string }[] = [
  {
    status: "cleared",
    icon: CheckCircle2,
    hint: "The similarity is explained: shared topic, standard method or proper citation.",
  },
  {
    status: "follow_up",
    icon: MessageSquareWarning,
    hint: "Some passages need a conversation with the student or supervisor.",
  },
  { status: "pending", icon: Clock, hint: "Not decided yet." },
];

function when(iso?: string | null) {
  return iso
    ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "";
}

/**
 * The review decision on a report. Everyone who can see the report sees the
 * decision; reviewers can also record or change it. The score never decides.
 */
export function ReviewPanel({
  report,
  canReview,
  onChange,
}: {
  report: ReportSummary;
  canReview: boolean;
  onChange: (report: ReportSummary) => void;
}) {
  const status = report.reviewStatus ?? "pending";
  const [choice, setChoice] = useState<ReviewStatus>(status === "pending" ? "cleared" : status);
  const [note, setNote] = useState(report.reviewNote ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const { report: updated } = await recordReview(report.id, choice, note);
      onChange(updated);
      toast.success(`Marked as “${REVIEW_LABELS[choice]}”`);
    } catch (err) {
      toast.error(err instanceof AnalysisError ? err.message : "Couldn't save the decision.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="review-title"
      className="border-border bg-card rounded-3xl border p-6 sm:p-8 print:break-inside-avoid"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="review-title" className="flex items-center gap-2 text-lg font-semibold">
          <Gavel className="text-brand size-5" aria-hidden />
          Review
        </h2>
        <ReviewStatusBadge status={status} />
      </div>

      {(report.ownerName || report.ownerUniversityId) && canReview && (
        <p className="text-muted-foreground mt-2 text-sm">
          Submitted by <span className="text-foreground font-medium">{report.ownerName}</span>
          {report.ownerUniversityId && (
            <span className="font-mono"> · {report.ownerUniversityId}</span>
          )}
        </p>
      )}

      {status !== "pending" ? (
        <div className="bg-muted/50 mt-4 rounded-2xl p-4 text-sm">
          <p>
            <span className="font-medium">{REVIEW_LABELS[status]}</span>
            {report.reviewerName && <> · {report.reviewerName}</>}
            {report.reviewedAt && (
              <span className="text-muted-foreground"> · {when(report.reviewedAt)}</span>
            )}
          </p>
          {report.reviewNote && <p className="mt-2 whitespace-pre-wrap">{report.reviewNote}</p>}
        </div>
      ) : (
        <p className="text-muted-foreground mt-4 text-sm">
          {canReview
            ? "No decision yet. Read the evidence above, then record what you found."
            : "A reviewer hasn't looked at this report yet."}
        </p>
      )}

      {canReview && (
        <div className="mt-6 space-y-4 print:hidden">
          <fieldset>
            <legend className="text-sm font-medium">Decision</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {CHOICES.map(({ status: value, icon: Icon, hint }) => (
                <label
                  key={value}
                  className={cn(
                    "border-border hover:bg-muted/40 has-[:focus-visible]:ring-ring flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-2",
                    choice === value && "border-primary bg-semantic-soft",
                  )}
                >
                  <input
                    type="radio"
                    name="review-status"
                    value={value}
                    checked={choice === value}
                    onChange={() => setChoice(value)}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="size-4" aria-hidden />
                    {REVIEW_LABELS[value]}
                  </span>
                  <span className="text-muted-foreground text-xs">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="review-note">
              Note <span className="text-muted-foreground font-normal">(the student sees it)</span>
            </Label>
            <textarea
              id="review-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="e.g. The matching passages in Chapter 2 are properly cited."
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-y rounded-xl border px-3.5 py-3 text-sm outline-none focus-visible:ring-2"
            />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" aria-hidden />}
            Save decision
          </Button>
        </div>
      )}
    </section>
  );
}
