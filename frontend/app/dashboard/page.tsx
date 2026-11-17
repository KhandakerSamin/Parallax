import type { Metadata } from "next";
import { OverviewPage } from "@/components/overview/OverviewPage";

export const metadata: Metadata = {
  title: "Overview — Parallax",
};

export default function DashboardRoute() {
  return <OverviewPage />;
}
