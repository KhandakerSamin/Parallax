import type { Metadata } from "next";
import { SavedReportView } from "@/components/analysis/SavedReportView";
import { Navbar } from "@/components/layout/Navbar";
import { SkipLink } from "@/components/layout/SkipLink";

export const metadata: Metadata = {
  title: "Similarity report — Parallax",
  robots: { index: false, follow: false },
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <SkipLink />
      <Navbar />
      <main id="main" className="container-page max-w-5xl pt-28 pb-16 md:pt-32">
        <SavedReportView id={id} />
      </main>
    </>
  );
}
