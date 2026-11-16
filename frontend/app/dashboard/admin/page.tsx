import type { Metadata } from "next";
import { AdminView } from "@/components/admin/AdminView";
import { Navbar } from "@/components/layout/Navbar";
import { SkipLink } from "@/components/layout/SkipLink";

export const metadata: Metadata = {
  title: "Admin — Parallax",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <SkipLink />
      <Navbar />
      <main id="main" className="container-page max-w-5xl pt-28 pb-16 md:pt-32">
        <AdminView />
      </main>
    </>
  );
}
