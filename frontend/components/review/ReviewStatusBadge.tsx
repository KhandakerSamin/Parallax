import { CheckCircle2, Clock, MessageSquareWarning } from "lucide-react";
import { REVIEW_LABELS, type ReviewStatus } from "@/lib/analysis/types";
import { cn } from "@/lib/utils";

const STYLE: Record<ReviewStatus, { icon: typeof Clock; className: string }> = {
  pending: { icon: Clock, className: "bg-muted text-muted-foreground" },
  cleared: { icon: CheckCircle2, className: "bg-accent-soft text-accent" },
  follow_up: { icon: MessageSquareWarning, className: "bg-lexical-soft text-lexical" },
};

/** A reviewer's decision as a small pill: icon and words, never colour alone. */
export function ReviewStatusBadge({
  status = "pending",
  className,
}: {
  status?: ReviewStatus;
  className?: string;
}) {
  const { icon: Icon, className: tone } = STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {REVIEW_LABELS[status]}
    </span>
  );
}
