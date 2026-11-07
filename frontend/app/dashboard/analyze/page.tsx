import type { Metadata } from "next";
import { AnalyzeView } from "@/components/analysis/AnalyzeView";
import { Navbar } from "@/components/layout/Navbar";
import { SkipLink } from "@/components/layout/SkipLink";

export const metadata: Metadata = {
  title: "Analyze a document — Parallax",
  robots: { index: false, follow: false },
};

export default function AnalyzePage() {
  return (
    <>
      <SkipLink />
      <Navbar />
      <main id="main" className="container-page max-w-5xl pt-28 pb-16 md:pt-32">
        <AnalyzeView />
      </main>
    </>
  );
}
