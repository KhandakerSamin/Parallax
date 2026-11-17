import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app/shell/AppShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Every /dashboard page shares the app shell: sidebar, top bar and footer note. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
