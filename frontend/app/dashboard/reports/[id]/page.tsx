import type { Metadata } from "next";
import { ReportPage } from "@/components/report/ReportPage";

export const metadata: Metadata = {
  title: "Similarity report — Parallax",
};

export default async function SavedReportRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportPage id={id} />;
}
