"use client";

import {
  ArrowRight,
  Building2,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  FileStack,
  FileText,
  FileType2,
  Gauge,
  IdCard,
  Mail,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";
import { GoogleMark } from "@/components/auth/GoogleButton";
import {
  DecisionChip,
  EmptyState,
  ErrorState,
  LevelBadge,
  LevelIcon,
  Panel,
  Skeleton,
  StatTile,
} from "@/components/app/ui";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { useAuth } from "@/components/providers/AuthProvider";
import { ReportsTable } from "@/components/reports/ReportsTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStats } from "@/lib/admin/api";
import { listReports, listReviewQueue } from "@/lib/analysis/api";
import type { ReportSummary } from "@/lib/analysis/types";
import { daysSince, formatDate, langProps, relativeTime } from "@/lib/app/format";
import { CORPUS, LEVELS, PERSPECTIVES } from "@/lib/app/terms";
import { useLoad } from "@/lib/app/useLoad";
import { ROLE_LABELS, idLabel, isAdmin, isReviewer, type User } from "@/lib/auth/types";

const loadMine = () => listReports(100);
const loadQueue = () => listReviewQueue({ status: "pending", limit: 200 });

export function OverviewPage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-6">
      <WelcomeBand user={user} />
      <MyActivity />
      {isReviewer(user.role) && <ReviewSnapshot />}
      {isAdmin(user.role) && <SystemSnapshot />}
      <HowToRead />
    </div>
  );
}

function WelcomeBand({ user }: { user: User }) {
  const details = [
    { icon: Mail, label: "Email", value: user.email },
    { icon: IdCard, label: idLabel(user.role), value: user.universityId },
    { icon: Building2, label: "Department", value: user.department },
  ];
  return (
    <section
      aria-labelledby="welcome-title"
      className="border-border relative overflow-hidden rounded-3xl border p-6 sm:p-8"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 120% at 0% 0%, var(--semantic-soft), transparent 70%), radial-gradient(40% 100% at 70% 0%, var(--concept-soft), transparent 70%), radial-gradient(45% 110% at 100% 100%, var(--lexical-soft), transparent 70%), var(--card)",
        }}
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={user.name}
            src={user.avatarUrl}
            className="ring-background size-16 shadow-md ring-4"
            fallbackClassName="text-lg"
          />
          <div className="min-w-0">
            <h1 id="welcome-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Hello, {user.name.split(" ")[0]}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="brand">{ROLE_LABELS[user.role]}</Badge>
              {user.googleLinked && (
                <span className="border-border bg-card/70 text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
                  <GoogleMark className="size-3" />
                  Google account
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/analyze?mode=pdf">
              <FileType2 aria-hidden />
              Upload a PDF
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard/analyze?mode=text">
              <FileText aria-hidden />
              Paste text
            </Link>
          </Button>
        </div>
      </div>
      <dl className="border-border/70 relative mt-6 grid gap-4 border-t pt-5 sm:grid-cols-3">
        {details.map(({ icon: Icon, label, value }) => (
          <div key={label} className="min-w-0">
            <dt className="text-muted-foreground flex items-center gap-2 text-xs">
              <Icon className="size-3.5 shrink-0" aria-hidden />
              {label}
            </dt>
            <dd className="mt-0.5 truncate pl-5.5 text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground relative mt-5 text-sm">
        Parallax compares your work with {CORPUS.reports.toLocaleString()} earlier DIU reports and
        shows the evidence.
      </p>
    </section>
  );
}

function MyActivity() {
  const { state, reload } = useLoad(loadMine, "Couldn't load your reports.");
  const reports = state.status === "ready" ? state.data : [];
  const loading = state.status === "loading";
  const reviewed = reports.filter(
    (r) => r.reviewStatus === "cleared" || r.reviewStatus === "follow_up",
  );
  const followUp = reports.filter((r) => r.reviewStatus === "follow_up").length;
  const latest = reports[0];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Reports analysed"
          icon={FileStack}
          value={reports.length}
          loading={loading}
          href="/dashboard/reports"
        />
        <StatTile
          label="Reviewed"
          icon={ClipboardCheck}
          value={reviewed.length}
          loading={loading}
          hint="No concern or needs follow-up"
        />
        <StatTile
          label="Needs follow-up"
          icon={CircleAlert}
          value={followUp}
          loading={loading}
          highlight={followUp > 0}
          href={followUp > 0 ? "/dashboard/reports?decision=follow_up" : undefined}
          hint={followUp > 0 ? "Open these reports to read the reviewer's note" : undefined}
        />
        <StatTile
          label="Latest level"
          icon={Gauge}
          loading={loading}
          value={
            latest ? (
              <LevelBadge level={latest.level} value={latest.overall} size="lg" />
            ) : (
              <span className="text-muted-foreground text-base font-normal">No reports yet</span>
            )
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Panel
          title="Recent reports"
          className="xl:col-span-8"
          action={
            reports.length > 0 && (
              <Link
                href="/dashboard/reports"
                className="text-brand inline-flex items-center gap-1 text-sm font-medium hover:underline"
              >
                View all reports
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            )
          }
        >
          {state.status === "loading" && <TableSkeleton rows={4} />}
          {state.status === "error" && (
            <ErrorState message={state.message} status={state.code} onRetry={reload} />
          )}
          {state.status === "ready" && reports.length === 0 && (
            <EmptyState
              title="No reports yet"
              body="Analyze a document and its report will be saved here."
              action={
                <Button asChild>
                  <Link href="/dashboard/analyze">Analyze a document</Link>
                </Button>
              }
            />
          )}
          {state.status === "ready" && reports.length > 0 && (
            <ReportsTable
              compact
              reports={reports.slice(0, 6)}
              caption="Your 6 most recent reports"
            />
          )}
        </Panel>

        <Panel title="Reviewer feedback" className="xl:col-span-4">
          {state.status === "loading" && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          )}
          {state.status === "error" && (
            <p className="text-muted-foreground text-sm">Not available right now.</p>
          )}
          {state.status === "ready" && <Feedback reports={reviewed} />}
        </Panel>
      </div>
    </>
  );
}

function Feedback({ reports }: { reports: ReportSummary[] }) {
  const latest = [...reports]
    .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))
    .slice(0, 5);
  if (!latest.length) {
    return (
      <EmptyState
        art={false}
        title="No reviewer decisions yet"
        body="When a reviewer looks at one of your reports, their decision appears here."
      />
    );
  }
  return (
    <ul className="divide-border -my-2 divide-y">
      {latest.map((report) => (
        <li key={report.id}>
          <Link
            href={`/dashboard/reports/${report.id}`}
            className="hover:bg-muted/50 -mx-2 block rounded-xl px-2 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <DecisionChip status={report.reviewStatus} />
              <time
                className="text-muted-foreground text-xs"
                dateTime={report.reviewedAt ?? undefined}
              >
                {relativeTime(report.reviewedAt)}
              </time>
            </div>
            <p {...langProps(report.title)} className="bn-aware mt-2 truncate text-sm font-medium">
              {report.title}
            </p>
            {report.reviewNote && (
              <p
                {...langProps(report.reviewNote)}
                className="bn-aware text-muted-foreground clamp-2 mt-0.5 text-sm"
              >
                <MessageSquareText className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
                {report.reviewNote}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ReviewSnapshot() {
  const { state, reload } = useLoad(loadQueue, "Couldn't load the review queue.");
  const waiting = state.status === "ready" ? state.data : [];
  const high = waiting.filter((r) => r.level === "high").length;
  const oldest = [...waiting].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, 5);
  return (
    <Panel
      title="Review queue"
      description="Reports waiting for a reviewer's decision."
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/reviews">
            Open review queue
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      }
    >
      {state.status === "loading" && <TableSkeleton rows={3} />}
      {state.status === "error" && (
        <ErrorState message={state.message} status={state.code} onRetry={reload} />
      )}
      {state.status === "ready" && (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div className="bg-muted/60 rounded-2xl p-4">
              <p className="text-muted-foreground text-xs">Awaiting review</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{waiting.length}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: LEVELS.high.soft }}>
              <p className="flex items-center gap-1.5 text-xs" style={{ color: LEVELS.high.color }}>
                <LevelIcon level="high" />
                of them High
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{high}</p>
            </div>
          </div>
          {oldest.length ? (
            <div>
              <p className="text-muted-foreground mb-2 text-xs">Waiting longest</p>
              <ul className="divide-border divide-y">
                {oldest.map((r) => {
                  const days = daysSince(r.createdAt);
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/dashboard/reports/${r.id}`}
                        className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5"
                      >
                        <span
                          {...langProps(r.title)}
                          className="bn-aware min-w-0 flex-1 truncate text-sm font-medium"
                        >
                          {r.title}
                        </span>
                        <LevelBadge level={r.level} size="sm" />
                        <span
                          className={
                            days >= 7
                              ? "text-danger text-xs font-medium"
                              : days >= 3
                                ? "text-xs font-medium text-[var(--level-moderate)]"
                                : "text-muted-foreground text-xs"
                          }
                          title={formatDate(r.createdAt)}
                        >
                          {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"}`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <EmptyState
              art={false}
              title="Nothing is waiting"
              body="Every report has a decision."
            />
          )}
        </div>
      )}
    </Panel>
  );
}

function SystemSnapshot() {
  const { state, reload } = useLoad(getStats, "Couldn't load the system numbers.");
  const stats = state.status === "ready" ? state.data : null;
  const loading = state.status === "loading";
  const staff = stats
    ? stats.usersByRole.reviewer + stats.usersByRole.admin + stats.usersByRole.super_admin
    : 0;
  return (
    <Panel
      title="System"
      description="Everyone using Parallax."
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/admin">
            Open administration
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      }
    >
      {state.status === "error" ? (
        <ErrorState message={state.message} status={state.code} onRetry={reload} />
      ) : (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["People", stats?.users],
            ["Reviewers & admins", staff],
            ["Reports", stats?.reports],
            ["Awaiting review", stats?.reviewsByStatus.pending],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-muted/60 rounded-2xl p-4">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {loading ? <Skeleton className="h-7 w-12" /> : (value ?? 0)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

function HowToRead() {
  return (
    <details className="group border-border bg-card rounded-2xl border shadow-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="text-base font-semibold tracking-tight">How to read your results</span>
        <ChevronDown
          className="text-muted-foreground size-4 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="grid gap-6 px-5 pb-6 sm:px-6 lg:grid-cols-[2fr_1fr]">
        <ul className="grid gap-3 sm:grid-cols-2">
          {PERSPECTIVES.map((p) => (
            <li key={p.key} className="flex gap-3">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-lg"
                style={{ background: p.soft, color: p.color }}
              >
                <p.icon className="size-4" aria-hidden />
              </span>
              <span className="text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · weight {Math.round(p.weight * 100)}%
                </span>
                <span className="text-muted-foreground block">{p.question}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="space-y-2.5 text-sm">
          {(["high", "moderate", "low"] as const).map((level) => (
            <p key={level} className="flex items-center gap-2">
              <LevelBadge level={level} size="sm" />
              <span className="text-muted-foreground">{LEVELS[level].range}</span>
            </p>
          ))}
          <p className="text-muted-foreground pt-2">
            The overall score is the share of your text that matches the corpus, by the stronger of
            wording and meaning. A high score is not proof of copying: a reviewer reads the
            evidence.
          </p>
        </div>
      </div>
    </details>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-4 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}
