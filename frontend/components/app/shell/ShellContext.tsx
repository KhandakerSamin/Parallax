"use client";

import { createContext, useContext, useEffect } from "react";

type ShellContextValue = {
  /** The last breadcrumb, set by a page that knows a better name (a report title). */
  setPageTitle: (title: string | null) => void;
  /** Reports awaiting review (reviewers and admins), or null while unknown. */
  reviewCount: number | null;
  refreshReviewCount: () => void;
};

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside the dashboard shell");
  return ctx;
}

/** Sets the last breadcrumb while the page is open. */
export function usePageTitle(title: string | null | undefined) {
  const { setPageTitle } = useShell();
  useEffect(() => {
    setPageTitle(title ?? null);
    return () => setPageTitle(null);
  }, [title, setPageTitle]);
}
