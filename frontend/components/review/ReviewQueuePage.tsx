"use client";

import { Keyboard, Search, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DecisionChip,
  EmptyState,
  ErrorState,
  LevelBadge,
  PageHeader,
  Panel,
  Skeleton,
} from "@/components/app/ui";
import { useAuth } from "@/components/providers/AuthProvider";
import { Input } from "@/components/ui/input";
import { listReviewQueue } from "@/lib/analysis/api";
import type { ReportSummary, ReviewStatus } from "@/lib/analysis/types";
import { daysSince, formatDate, langProps } from "@/lib/app/format";
import { DECISIONS } from "@/lib/app/terms";
import { useLoad } from "@/lib/app/useLoad";
import { isReviewer } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

const loadAll = () => listReviewQueue({ limit: 200 });

type Tab = ReviewStatus | "all";
const TABS: Tab[] = ["pending", "follow_up", "cleared", "all"];

function waitingClass(days: number): string {
  if (days >= 7) return "text-danger font-medium";
  if (days >= 3) return "font-medium text-[var(--level-moderate)]";
  return "text-muted-foreground";
}

/** /dashboard/reviews: every student's reports for reviewers, oldest undecided first. */
export function ReviewQueuePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { state, reload } = useLoad(loadAll, "Couldn't load the review queue.");
  const [tab, setTab] = useState<Tab>("pending");
  const [level, setLevel] = useState("");
  const [department, setDepartment] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const rowRefs = useRef<(HTMLElement | null)[]>([]);

  const all = useMemo(() => (state.status === "ready" ? state.data : []), [state]);
  const counts = useMemo(() => {
    const c: Record<Tab, number> = { pending: 0, follow_up: 0, cleared: 0, all: all.length };
    for (const r of all) c[r.reviewStatus ?? "pending"] += 1;
    return c;
  }, [all]);
  const departments = useMemo(
    () => [...new Set(all.map((r) => r.ownerDepartment).filter((d): d is string => !!d))].sort(),
    [all],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = all.filter((r) => {
      const status = r.reviewStatus ?? "pending";
      const day = r.createdAt.slice(0, 10);
      return (
        (tab === "all" || status === tab) &&
        (!level || r.level === level) &&
        (!department || r.ownerDepartment === department) &&
        (!from || day >= from) &&
        (!to || day <= to) &&
        (!needle ||
          r.title.toLowerCase().includes(needle) ||
          (r.ownerName ?? "").toLowerCase().includes(needle) ||
          (r.ownerUniversityId ?? "").toLowerCase().includes(needle))
      );
    });
    // Awaiting: oldest first, so nothing waits forever. Others: newest first.
    return list.sort((a, b) =>
      tab === "pending"
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt),
    );
  }, [all, tab, level, department, from, to, q]);

  // J / K move between rows, Enter opens one (outside text fields).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        target.closest("input, textarea, select, [contenteditable]") ||
        event.metaKey ||
        event.ctrlKey
      )
        return;
      if (event.key === "j" || event.key === "k") {
        event.preventDefault();
        setCursor((c) => {
          const next = Math.min(
            Math.max(c + (event.key === "j" ? 1 : -1), 0),
            Math.max(rows.length - 1, 0),
          );
          rowRefs.current[next]?.focus();
          return next;
        });
      } else if (event.key === "Enter" && rows[cursor] && target === rowRefs.current[cursor]) {
        router.push(`/dashboard/reports/${rows[cursor].id}#review`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, cursor, router]);

  if (user && !isReviewer(user.role)) {
    return (
      <EmptyState
        art={false}
        title="The review queue is for reviewers"
        body="Ask an administrator if you should have reviewer access."
        action={<ShieldAlert className="text-muted-foreground size-6" aria-hidden />}
      />
    );
  }

  const open = (r: ReportSummary) => router.push(`/dashboard/reports/${r.id}#review`);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review queue"
        description="Read the evidence and record a decision. The score never decides."
        actions={
          state.status === "ready" && (
            <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span>
                <strong className="text-foreground tabular-nums">{counts.pending}</strong> awaiting
              </span>
              <span>
                <strong className="text-foreground tabular-nums">{counts.follow_up}</strong>{" "}
                follow-up
              </span>
              <span>
                <strong className="text-foreground tabular-nums">{counts.cleared}</strong> no
                concern
              </span>
            </p>
          )
        }
      />
      <Panel bodyClassName="p-0 sm:p-0">
        <div className="border-border border-b px-4 pt-4 sm:px-6">
          <div
            role="tablist"
            aria-label="Decision"
            className="no-scrollbar -mb-px flex gap-1 overflow-x-auto"
          >
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => {
                  setTab(t);
                  setCursor(0);
                }}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 pb-3 text-sm font-medium transition-colors",
                  tab === t
                    ? "border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {t === "all" ? "All" : DECISIONS[t].label}
                <span className="bg-muted rounded-full px-2 py-0.5 text-xs tabular-nums">
                  {counts[t]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 px-4 py-4 sm:px-6">
          <div className="relative w-full sm:w-72">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, student name or ID"
              aria-label="Search by title, student name or ID"
              className="pl-9"
            />
          </div>
          <FilterSelect
            label="Level"
            value={level}
            onChange={setLevel}
            options={[
              ["", "Any level"],
              ["high", "High"],
              ["moderate", "Moderate"],
              ["low", "Low"],
            ]}
          />
          <FilterSelect
            label="Department"
            value={department}
            onChange={setDepartment}
            options={[
              ["", "All departments"],
              ...departments.map((d) => [d, d] as [string, string]),
            ]}
          />
          <label className="text-muted-foreground flex flex-col gap-1 text-xs">
            From
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-11 w-40"
            />
          </label>
          <label className="text-muted-foreground flex flex-col gap-1 text-xs">
            To
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-11 w-40"
            />
          </label>
        </div>

        <div className="px-4 pb-5 sm:px-6">
          {state.status === "loading" && (
            <div className="space-y-3" aria-busy="true" aria-label="Loading the review queue">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}
          {state.status === "error" && (
            <ErrorState message={state.message} status={state.code} onRetry={reload} />
          )}
          {state.status === "ready" && rows.length === 0 && (
            <EmptyState
              art={false}
              title={all.length ? "Nothing matches these filters" : "No reports yet"}
              body={
                tab === "pending" && all.length
                  ? "Every report in this view has a decision."
                  : undefined
              }
            />
          )}
          {rows.length > 0 && (
            <>
              <div className="-mx-1 hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm 2xl:min-w-[960px]">
                  <caption className="sr-only">Reports for review</caption>
                  <thead>
                    <tr className="text-muted-foreground text-left text-xs">
                      {[
                        "Student",
                        "Title",
                        "Level",
                        "Closest source",
                        "Submitted",
                        "Waiting",
                        "Decision",
                      ].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className={cn(
                            "border-border border-b px-3 pb-2.5 font-medium",
                            h === "Submitted" && "hidden 2xl:table-cell",
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const pending = (r.reviewStatus ?? "pending") === "pending";
                      const days = daysSince(r.createdAt);
                      return (
                        <tr
                          key={r.id}
                          ref={(el) => {
                            rowRefs.current[i] = el;
                          }}
                          tabIndex={0}
                          onClick={() => open(r)}
                          onFocus={() => setCursor(i)}
                          className={cn(
                            "hover:bg-muted/50 focus-visible:bg-semantic-soft/40 cursor-pointer outline-none",
                            cursor === i && "bg-muted/40",
                          )}
                        >
                          <td className="border-border border-b px-3 py-3">
                            <span className="block font-medium">{r.ownerName ?? "Unknown"}</span>
                            <span className="text-muted-foreground font-mono text-xs">
                              {r.ownerUniversityId}
                            </span>
                          </td>
                          <td className="border-border max-w-52 border-b px-3 py-3 2xl:max-w-64">
                            <Link
                              href={`/dashboard/reports/${r.id}#review`}
                              onClick={(e) => e.stopPropagation()}
                              tabIndex={-1}
                              {...langProps(r.title)}
                              className="bn-aware clamp-2 font-medium hover:underline"
                            >
                              {r.title}
                            </Link>
                          </td>
                          <td className="border-border border-b px-3 py-3">
                            <LevelBadge level={r.level} value={r.overall} />
                          </td>
                          <td className="border-border text-muted-foreground max-w-44 border-b px-3 py-3 2xl:max-w-56">
                            <span {...langProps(r.topSourceTitle)} className="bn-aware clamp-2">
                              {r.topSourceTitle ?? "—"}
                            </span>
                          </td>
                          <td className="border-border text-muted-foreground hidden border-b px-3 py-3 whitespace-nowrap 2xl:table-cell">
                            {formatDate(r.createdAt, false)}
                          </td>
                          <td
                            className={cn(
                              "border-border border-b px-3 py-3 whitespace-nowrap",
                              pending ? waitingClass(days) : "text-muted-foreground",
                            )}
                          >
                            {pending
                              ? days === 0
                                ? "Today"
                                : `${days} day${days === 1 ? "" : "s"}`
                              : "—"}
                          </td>
                          <td className="border-border border-b px-3 py-3">
                            <DecisionChip status={r.reviewStatus} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-3 lg:hidden" aria-label="Reports for review">
                {rows.map((r) => {
                  const pending = (r.reviewStatus ?? "pending") === "pending";
                  const days = daysSince(r.createdAt);
                  return (
                    <li key={r.id} className="border-border relative rounded-2xl border p-4">
                      <Link
                        href={`/dashboard/reports/${r.id}#review`}
                        {...langProps(r.title)}
                        className="bn-aware block font-medium after:absolute after:inset-0"
                      >
                        {r.title}
                      </Link>
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        {r.ownerName} ·{" "}
                        <span className="font-mono text-xs">{r.ownerUniversityId}</span>
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <LevelBadge level={r.level} value={r.overall} size="sm" />
                        <DecisionChip status={r.reviewStatus} />
                        {pending && (
                          <span className={cn("ml-auto text-xs", waitingClass(days))}>
                            Waiting{" "}
                            {days === 0 ? "since today" : `${days} day${days === 1 ? "" : "s"}`}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-muted-foreground mt-4 hidden items-center gap-2 text-xs lg:flex">
                <Keyboard className="size-3.5" aria-hidden />
                Press <kbd className="bg-muted rounded px-1.5 font-mono">J</kbd> /{" "}
                <kbd className="bg-muted rounded px-1.5 font-mono">K</kbd> to move between rows and{" "}
                <kbd className="bg-muted rounded px-1.5 font-mono">Enter</kbd> to open one.
              </p>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="text-muted-foreground flex flex-col gap-1 text-xs">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-input bg-card text-foreground h-11 max-w-56 rounded-xl border px-3 text-sm"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
