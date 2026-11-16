"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAnalysis, loadAnalysis, saveAnalysis } from "@/lib/analysis/api";
import type { SavedAnalysis } from "@/lib/analysis/types";
import { AnalyzeForm } from "./AnalyzeForm";
import { ReportView } from "./ReportView";

/**
 * /dashboard/analyze: the upload form. A finished analysis is saved by the backend,
 * so the page moves on to that report's own page. If it could not be saved, the
 * report shows here and is kept for this tab.
 */
export function AnalyzeView() {
  const router = useRouter();
  const [saved, setSaved] = useState<SavedAnalysis | null>(null);

  useEffect(() => {
    // Restore after hydration so the server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(loadAnalysis());
  }, []);

  function onResult(next: SavedAnalysis) {
    if (next.result.report_id) {
      clearAnalysis();
      router.push(`/dashboard/reports/${next.result.report_id}`);
      return;
    }
    saveAnalysis(next);
    setSaved(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onReset() {
    clearAnalysis();
    setSaved(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors print:hidden"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Dashboard
      </Link>

      {saved ? (
        <ReportView key={saved.analyzedAt} saved={saved} onReset={onReset} />
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          aria-labelledby="analyze-title"
          className="border-border bg-card shadow-soft rounded-3xl border p-6 sm:p-8"
        >
          <h1 id="analyze-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Analyze a document
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Parallax compares your report with past DIU Software Engineering reports and shows
            passages that share wording or meaning, including Bangla-English translation.
          </p>
          <div className="mt-8">
            <AnalyzeForm onResult={onResult} />
          </div>
          <p className="text-muted-foreground mt-8 flex items-start gap-2 text-xs">
            <ShieldCheck className="text-accent mt-0.5 size-3.5 shrink-0" aria-hidden />
            Your document is analyzed and not added to the corpus. Results show potential similarity
            for a person to review, never a verdict.
          </p>
        </motion.section>
      )}
    </div>
  );
}
