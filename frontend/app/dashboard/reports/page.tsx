import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/app/ui";
import { MyReportsPage } from "@/components/reports/MyReportsPage";

export const metadata: Metadata = {
  title: "My reports — Parallax",
};

export default function MyReportsRoute() {
  // Filters live in the URL query, which needs a Suspense boundary.
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <MyReportsPage />
    </Suspense>
  );
}
