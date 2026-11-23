"use client";

import { FileQuestion, Gavel, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { usePageTitle, useShell } from "@/components/app/shell/ShellContext";
import { ConfirmDialog, ErrorState, Skeleton } from "@/components/app/ui";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { deleteReport, getReport } from "@/lib/analysis/api";
import { AnalysisError, type SavedReport } from "@/lib/analysis/types";
import { isReviewer } from "@/lib/auth/types";
import { ReportHeader, PerspectiveTiles, SummaryBand, topMatch } from "./ReportSummary";
import { DecisionCard, InterpretationPanel, ReviewPanel } from "./ReviewSection";
import { SourcesExplorer } from "./SourcesExplorer";

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string; code: number }
  | { status: "ready"; saved: SavedReport };

/** /dashboard/reports/<id>: one saved report, scannable in seconds, with all its evidence. */
export function ReportPage({ id }: { id: string }) {
  const { user } = useAuth();
  const { refreshReviewCount } = useShell();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const fetchReport = useCallback(() => {
    getReport(id)
      .then((saved) => setState({ status: "ready", saved }))
      .catch((err) => {
        // Someone else's report answers exactly like a missing one.
        if (err instanceof AnalysisError && err.status === 404) setState({ status: "missing" });
        else
          setState({
            status: "error",
            message: err instanceof AnalysisError ? err.message : "Couldn't load this report.",
            code: err instanceof AnalysisError ? err.status : 0,
          });
      });
  }, [id]);

  useEffect(fetchReport, [fetchReport]);
  const load = () => {
    setState({ status: "loading" });
    fetchReport();
  };
  usePageTitle(state.status === "ready" ? state.saved.report.title : null);

  // Opened from the review queue (#review): bring the review panel into view.
  const ready = state.status === "ready";
  useEffect(() => {
    if (!ready || !user || !isReviewer(user.role) || window.location.hash !== "#review") return;
    if (window.matchMedia("(min-width: 1280px)").matches) {
      document.getElementById("review")?.scrollIntoView({ block: "start" });
      noteRef.current?.focus({ preventScroll: true });
    }
  }, [ready, user]);

  if (state.status === "loading") return <ReportSkeleton />;
  if (state.status === "missing") return <ReportNotFound />;
  if (state.status === "error") {
    return <ErrorState message={state.message} status={state.code} onRetry={load} />;
  }

  const { saved } = state;
  const { report, result } = saved;
  const own = !!user && report.userId === user.id;
  const reviewer = !!user && isReviewer(user.role);
  const ownerLabel = own
    ? "You"
    : [report.ownerName, report.ownerUniversityId].filter(Boolean).join(" · ") || "Another user";

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteReport(report.id);
      toast.success("Report deleted");
      router.push("/dashboard/reports");
    } catch (err) {
      toast.error(err instanceof AnalysisError ? err.message : "Couldn't delete the report.");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  function jumpToReview() {
    if (window.matchMedia("(min-width: 1280px)").matches) {
      document.getElementById("review")?.scrollIntoView({ behavior: "smooth", block: "start" });
      noteRef.current?.focus({ preventScroll: true });
    } else {
      setSheetOpen(true);
    }
  }

  function onReviewSaved(next: SavedReport) {
    setState({ status: "ready", saved: next });
    setSheetOpen(false);
    refreshReviewCount();
  }

  return (
    <div className="space-y-8">
      <ReportHeader
        saved={saved}
        ownerLabel={ownerLabel}
        canDelete={own && (saved.report.reviewStatus ?? "pending") === "pending"}
        canReview={reviewer}
        onDelete={() => setDeleteOpen(true)}
        onJumpToReview={jumpToReview}
      />
      <SummaryBand saved={saved} isOwnerStudent={own && !reviewer} />

      <div className={reviewer ? "grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]" : undefined}>
        <div className="min-w-0 space-y-8">
          <PerspectiveTiles match={topMatch(result.matches)} narrow={reviewer} />
          <SourcesExplorer matches={result.matches} narrow={reviewer} />
          <InterpretationPanel />
          {!reviewer && <DecisionCard report={report} />}
        </div>
        {reviewer && (
          <aside className="hidden xl:block print:hidden">
            <div className="sticky top-24">
              <ReviewPanel ref={noteRef} report={report} onSaved={onReviewSaved} />
            </div>
          </aside>
        )}
      </div>

      {reviewer && (
        <>
          {/* Below 1280 px the review panel opens as a bottom sheet. */}
          <div className="fixed right-4 bottom-4 z-30 xl:hidden print:hidden">
            <Button onClick={() => setSheetOpen(true)} className="shadow-lift">
              <Gavel aria-hidden />
              Record decision
            </Button>
          </div>
          <DialogPrimitive.Root open={sheetOpen} onOpenChange={setSheetOpen}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0b0f1a]/55 backdrop-blur-sm data-[state=open]:animate-[fade-in_200ms_ease-out]" />
              <DialogPrimitive.Content className="bg-background fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl p-4 shadow-2xl outline-none data-[state=open]:animate-[modal-in_300ms_cubic-bezier(0.22,1,0.36,1)]">
                <DialogPrimitive.Title className="sr-only">
                  Record a reviewer decision
                </DialogPrimitive.Title>
                <div aria-hidden className="bg-border mx-auto mb-3 h-1.5 w-10 rounded-full" />
                <ReviewPanel
                  report={report}
                  onSaved={onReviewSaved}
                  className="border-0 shadow-none"
                />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
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

function ReportNotFound() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="bg-muted text-muted-foreground grid size-14 place-items-center rounded-2xl">
        <FileQuestion className="size-6" aria-hidden />
      </span>
      <h1 className="mt-5 text-xl font-semibold">Report not found</h1>
      <p className="text-muted-foreground mt-2 max-w-sm">
        This report doesn&apos;t exist, was deleted, or isn&apos;t one you can open.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/dashboard/reports">Back to My reports</Link>
      </Button>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading report">
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-80 max-w-full" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-36 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
      </div>
      <div className="border-border grid gap-6 rounded-3xl border p-7 lg:grid-cols-[auto_1fr_1fr]">
        <Skeleton className="size-[168px] rounded-full" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-7 w-36 rounded-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-2 lg:col-span-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl lg:col-span-8" />
      </div>
    </div>
  );
}
