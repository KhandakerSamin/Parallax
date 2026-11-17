import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/app/ui";
import { SettingsPage } from "@/components/settings/SettingsPage";

export const metadata: Metadata = {
  title: "Settings — Parallax",
};

export default function SettingsRoute() {
  // The open section (?section=) lives in the URL, which needs a Suspense boundary.
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <SettingsPage />
    </Suspense>
  );
}
