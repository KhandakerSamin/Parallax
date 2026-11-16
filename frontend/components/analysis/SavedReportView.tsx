"use client";

import { ArrowLeft, FileSearch, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/providers/AuthProvider";
import { ReviewPanel } from "@/components/review/ReviewPanel";
import { Button } from "@/components/ui/button";
import { deleteReport, getReport } from "@/lib/analysis/api";
import { AnalysisError, type SavedReport } from "@/lib/analysis/types";
import { isReviewer } from "@/lib/auth/types";
import { ReportView } from "./ReportView";

type State =
  | { status: "loading" }
  | { status: "missing"; message: string }
  | { status: "ready"; saved: SavedReport };

function DeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await deleteReport(id);
      toast.success("Report deleted");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof AnalysisError ? err.message : "Couldn't delete the report.");
      setPending(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden />
        Delete
      </Button>
      <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <AlertDialogContent>
          <span className="bg-danger/10 text-danger grid size-11 place-items-center rounded-xl">
            <Trash2 className="size-5" aria-hidden />
          </span>
          <AlertDialogTitle className="mt-4">Delete this report?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{title}&rdquo; and its evidence will be removed for good.
          </AlertDialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <Button variant="danger" onClick={confirm} disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              Delete report
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** /dashboard/reports/[id]: a saved report, loaded from the backend. */
export function SavedReportView({ id }: { id: string }) {
  const { user } = useAuth();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getReport(id)
      .then((saved) => !cancelled && setState({ status: "ready", saved }))
      .catch(
        (err) =>
          !cancelled &&
          setState({
            status: "missing",
            message: err instanceof AnalysisError ? err.message : "Couldn't load this report.",
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors print:hidden"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Dashboard
      </Link>

      {state.status === "loading" && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading report">
          <div className="bg-muted h-80 animate-pulse rounded-3xl" />
          <div className="bg-muted h-28 animate-pulse rounded-2xl" />
          <div className="bg-muted h-28 animate-pulse rounded-2xl" />
        </div>
      )}

      {state.status === "missing" && (
        <div className="border-border bg-card rounded-3xl border p-10 text-center">
          <FileSearch className="text-muted-foreground mx-auto size-10" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold">Report not found</h1>
          <p className="text-muted-foreground mt-1">{state.message}</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/analyze">Analyze a document</Link>
          </Button>
        </div>
      )}

      {state.status === "ready" && (
        <ReportView
          saved={{
            result: state.saved.result,
            analyzedAt: state.saved.report.createdAt,
            sourceName: state.saved.report.sourceName,
          }}
          actions={
            user && state.saved.report.userId === user.id ? (
              <DeleteButton id={id} title={state.saved.report.title} />
            ) : null
          }
        />
      )}

      {state.status === "ready" && (
        <ReviewPanel
          report={state.saved.report}
          canReview={isReviewer(user?.role)}
          onChange={(report) =>
            setState((prev) =>
              prev.status === "ready"
                ? { status: "ready", saved: { ...prev.saved, report } }
                : prev,
            )
          }
        />
      )}
    </div>
  );
}
