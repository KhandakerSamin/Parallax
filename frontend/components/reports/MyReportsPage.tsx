"use client";

import { Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Skeleton,
} from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteReport, listReports } from "@/lib/analysis/api";
import { AnalysisError, type ReportSummary } from "@/lib/analysis/types";
import { useLoad } from "@/lib/app/useLoad";
import { ReportsTable } from "./ReportsTable";

const PAGE_SIZE = 20;
const loadMine = () => listReports(100);

const LEVEL_OPTIONS = [
  ["", "Any level"],
  ["high", "High"],
  ["moderate", "Moderate"],
  ["low", "Low"],
] as const;
const DECISION_OPTIONS = [
  ["", "All decisions"],
  ["pending", "Awaiting review"],
  ["cleared", "No concern"],
  ["follow_up", "Needs follow-up"],
] as const;
const TYPE_OPTIONS = [
  ["", "PDF and text"],
  ["pdf", "PDF"],
  ["text", "Text"],
] as const;
const SORT_OPTIONS = [
  ["newest", "Newest first"],
  ["oldest", "Oldest first"],
  ["score", "Highest score"],
] as const;

/** /dashboard/reports: every report you saved, with filters kept in the URL. */
export function MyReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { state, reload, setState } = useLoad(loadMine, "Couldn't load your reports.");
  const [pendingDelete, setPendingDelete] = useState<ReportSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const q = params.get("q") ?? "";
  const level = params.get("level") ?? "";
  const decision = params.get("decision") ?? "";
  const type = params.get("type") ?? "";
  const sort = params.get("sort") ?? "newest";
  const page = Math.max(1, Number(params.get("page")) || 1);

  function setParam(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.delete("page");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  const all = state.status === "ready" ? state.data : [];
  const filtered = all
    .filter((r) => !q || r.title.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => !level || r.level === level)
    .filter((r) => !decision || (r.reviewStatus ?? "pending") === decision)
    .filter((r) => !type || r.sourceKind === type)
    .sort((a, b) =>
      sort === "score"
        ? b.overall - a.overall
        : sort === "oldest"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtering = Boolean(q || level || decision || type);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteReport(pendingDelete.id);
      if (state.status === "ready") {
        setState({ status: "ready", data: state.data.filter((r) => r.id !== pendingDelete.id) });
      }
      toast.success("Report deleted");
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof AnalysisError ? err.message : "Couldn't delete the report.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My reports"
        description="Every analysis you ran is saved here with its evidence."
        actions={
          <Button asChild>
            <Link href="/dashboard/analyze">
              <Plus aria-hidden />
              New analysis
            </Link>
          </Button>
        }
      />
      <Panel>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              type="search"
              defaultValue={q}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder="Search by title"
              aria-label="Search reports by title"
              className="pl-9"
            />
          </div>
          <Select
            label="Level"
            value={level}
            options={LEVEL_OPTIONS}
            onChange={(v) => setParam("level", v)}
          />
          <Select
            label="Decision"
            value={decision}
            options={DECISION_OPTIONS}
            onChange={(v) => setParam("decision", v)}
          />
          <Select
            label="Type"
            value={type}
            options={TYPE_OPTIONS}
            onChange={(v) => setParam("type", v)}
          />
          <Select
            label="Sort"
            value={sort}
            options={SORT_OPTIONS}
            onChange={(v) => setParam("sort", v === "newest" ? "" : v)}
          />
        </div>

        {state.status === "loading" && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading reports">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {state.status === "error" && (
          <ErrorState message={state.message} status={state.code} onRetry={reload} />
        )}
        {state.status === "ready" && all.length === 0 && (
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
        {state.status === "ready" && all.length > 0 && filtered.length === 0 && (
          <EmptyState
            art={false}
            title="No reports match these filters"
            action={
              filtering && (
                <Button variant="outline" size="sm" onClick={() => router.replace(pathname)}>
                  Clear filters
                </Button>
              )
            }
          />
        )}
        {shown.length > 0 && (
          <>
            <ReportsTable
              reports={shown}
              showMenu
              onDelete={setPendingDelete}
              caption={`Your reports, page ${page} of ${pages}`}
            />
            <div className="text-muted-foreground mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span>
                {filtered.length} report{filtered.length === 1 ? "" : "s"}
                {filtering && ` (of ${all.length})`}
              </span>
              {pages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setParam("page", String(page - 1))}
                  >
                    Previous
                  </Button>
                  <span className="tabular-nums">
                    Page {page} of {pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pages}
                    onClick={() => setParam("page", String(page + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </Panel>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        icon={Trash2}
        tone="danger"
        title="Delete this report?"
        description="This can't be undone. The report, its evidence and any reviewer decision are removed."
        confirmLabel="Delete report"
        pending={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-muted-foreground flex items-center gap-2 text-sm">
      <span className="sr-only sm:not-sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-input bg-card text-foreground h-11 rounded-xl border px-3 text-sm"
        aria-label={label}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
