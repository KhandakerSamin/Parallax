"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  FileType2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ReviewStatus, SimilarityLevel } from "@/lib/analysis/types";
import { pct } from "@/lib/app/format";
import { DECISIONS, FOOTER_NOTE, LEVELS } from "@/lib/app/terms";
import { cn } from "@/lib/utils";

// ----- Levels: always a shape and a word, never colour alone -----------------

/** High = filled triangle, Moderate = half-filled circle, Low = ring with a dot. */
export function LevelIcon({ level, className }: { level: SimilarityLevel; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className={cn("size-3 shrink-0", className)}>
      {level === "high" && <path d="M6 1.2 11 10.6H1z" fill="currentColor" />}
      {level === "moderate" && (
        <>
          <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6 1.4a4.6 4.6 0 0 0 0 9.2z" fill="currentColor" />
        </>
      )}
      {level === "low" && (
        <>
          <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="6" cy="6" r="1.7" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

export function LevelBadge({
  level,
  value,
  size = "md",
  className,
}: {
  level: SimilarityLevel;
  /** Overall score to show beside the level, 0–1. */
  value?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const info = LEVELS[level] ?? LEVELS.low;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm",
        className,
      )}
      style={{ background: info.soft, color: info.color }}
      title={`${info.label}: ${info.range}`}
    >
      <LevelIcon level={level} className={size === "lg" ? "size-3.5" : undefined} />
      <span>{info.label}</span>
      {value !== undefined && <span className="text-foreground/80 tabular-nums">{pct(value)}</span>}
    </span>
  );
}

// ----- Reviewer decisions ----------------------------------------------------

const DECISION_STYLE: Record<ReviewStatus, { icon: LucideIcon; className: string }> = {
  pending: { icon: Clock3, className: "border-border bg-muted text-muted-foreground" },
  cleared: { icon: CheckCircle2, className: "border-success/30 bg-success/10 text-success" },
  follow_up: { icon: CircleAlert, className: "border-danger/30 bg-danger/10 text-danger" },
};

export function DecisionChip({
  status,
  className,
}: {
  status: ReviewStatus | undefined;
  className?: string;
}) {
  const key = status ?? "pending";
  const { icon: Icon, className: tone } = DECISION_STYLE[key];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {DECISIONS[key].label}
    </span>
  );
}

export function SourceKindIcon({ kind, className }: { kind: string; className?: string }) {
  const Icon = kind === "pdf" ? FileType2 : FileText;
  return (
    <Icon
      className={cn("text-muted-foreground size-4 shrink-0", className)}
      aria-label={kind === "pdf" ? "PDF" : "Text"}
    />
  );
}

export function SourceKindChip({ kind }: { kind: string }) {
  return (
    <span className="border-border text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
      <SourceKindIcon kind={kind} className="size-3.5" />
      {kind === "pdf" ? "PDF" : "Text"}
    </span>
  );
}

// ----- Layout pieces ---------------------------------------------------------

export function Panel({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
  ...props
}: Omit<ComponentProps<"section">, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn("border-border bg-card rounded-2xl border shadow-xs", className)}
      {...props}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
            {description && <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-5 sm:p-6", (title || action) && "pt-4 sm:pt-4", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-brand mb-1.5 text-xs font-semibold tracking-wide uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  href,
  highlight = false,
  loading = false,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: ReactNode;
  href?: string;
  highlight?: boolean;
  loading?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span
          className={cn(
            "grid size-9 place-items-center rounded-xl",
            highlight ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="mt-3 min-h-9 text-[1.75rem] leading-none font-semibold tracking-tight tabular-nums">
        {loading ? <Skeleton className="h-8 w-16" /> : value}
      </div>
      {hint && <p className="text-muted-foreground mt-2 text-xs">{hint}</p>}
    </>
  );
  const className = cn(
    "border-border bg-card block rounded-2xl border p-5 shadow-xs transition-colors",
    highlight && "border-danger/40",
    href && "hover:border-primary/40 focus-visible:border-primary/60",
  );
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

// ----- States ----------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-muted block animate-pulse rounded-lg motion-reduce:animate-none",
        className,
      )}
    />
  );
}

/** A small drawn illustration for empty states: a stack of reports with one highlighted. */
function EmptyArt() {
  return (
    <svg viewBox="0 0 120 84" aria-hidden className="h-20 w-28">
      <rect x="14" y="16" width="56" height="64" rx="8" fill="var(--muted)" />
      <rect x="26" y="8" width="56" height="64" rx="8" fill="var(--card)" stroke="var(--border)" />
      <rect x="36" y="20" width="30" height="4" rx="2" fill="var(--border)" />
      <rect x="36" y="30" width="36" height="4" rx="2" fill="var(--semantic-soft)" />
      <rect x="36" y="40" width="24" height="4" rx="2" fill="var(--border)" />
      <rect x="36" y="50" width="32" height="4" rx="2" fill="var(--concept-soft)" />
      <circle cx="90" cy="54" r="15" fill="var(--card)" stroke="var(--primary)" strokeWidth="3" />
      <path d="m101 65 9 9" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({
  title,
  body,
  action,
  art = true,
  className,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  art?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      {art && <EmptyArt />}
      <p className="mt-4 font-medium">{title}</p>
      {body && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** status 0 = the API can't be reached; 502–504 = the analysis service is down or busy. */
export function ErrorState({
  message,
  status,
  onRetry,
  className,
}: {
  message: string;
  status?: number;
  onRetry?: () => void;
  className?: string;
}) {
  const offline = status === 0;
  const aiDown = status !== undefined && status >= 502 && status <= 504;
  const Icon = offline ? WifiOff : AlertTriangle;
  const title = offline
    ? "Can't reach Parallax"
    : aiDown
      ? "The analysis service is unavailable"
      : "Something went wrong";
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center px-4 py-10 text-center", className)}
    >
      <span className="bg-danger/10 text-danger grid size-12 place-items-center rounded-2xl">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}

export function FooterNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-muted-foreground flex items-center gap-2 text-xs", className)}>
      <ShieldCheck className="text-accent size-3.5 shrink-0" aria-hidden />
      {FOOTER_NOTE}
    </p>
  );
}

// ----- Confirm dialog --------------------------------------------------------

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = "default",
  pending = false,
  onConfirm,
  icon: Icon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: "default" | "danger";
  pending?: boolean;
  onConfirm: () => void;
  icon?: LucideIcon;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        {Icon && (
          <span
            className={cn(
              "grid size-11 place-items-center rounded-xl",
              tone === "danger" ? "bg-danger/10 text-danger" : "bg-semantic-soft text-brand",
            )}
          >
            <Icon className="size-5" aria-hidden />
          </span>
        )}
        <AlertDialogTitle className={Icon ? "mt-4" : undefined}>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
