"use client";

import { useRef, type ReactNode } from "react";
import { ScrollRail } from "@/components/layout/ScrollRail";

/**
 * The form column of the auth pages. On desktop it scrolls on its own (with the
 * gradient rail) while the brand panel beside it stays fixed. On mobile the page
 * scrolls normally.
 */
export function AuthScrollArea({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="relative lg:h-dvh">
      <div
        ref={ref}
        data-lenis-prevent
        className="no-scrollbar flex min-h-dvh flex-col px-4 py-6 sm:px-10 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:px-16"
      >
        {children}
      </div>
      <ScrollRail container={ref} />
    </div>
  );
}
