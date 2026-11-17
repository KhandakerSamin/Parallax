import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalyzePage } from "@/components/analyze/AnalyzePage";
import { Skeleton } from "@/components/app/ui";

export const metadata: Metadata = {
  title: "Analyze a document — Parallax",
};

export default function AnalyzeRoute() {
  // The mode (?mode=pdf|text) is read from the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <AnalyzePage />
    </Suspense>
  );
}
