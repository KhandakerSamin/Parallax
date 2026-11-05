import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { Navbar } from "@/components/layout/Navbar";
import { SkipLink } from "@/components/layout/SkipLink";

export const metadata: Metadata = {
  title: "Dashboard — Parallax",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <>
      <SkipLink />
      <Navbar />
      <main id="main" className="container-page max-w-5xl pt-28 pb-16 md:pt-32">
        <DashboardView />
      </main>
    </>
  );
}
