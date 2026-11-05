"use client";

import { useInView } from "framer-motion";
import { useRef, type CSSProperties, type ReactNode } from "react";

type MarkerHighlightProps = {
  children: ReactNode;
  /** Highlight colour (CSS colour or variable). */
  color?: string;
  /** Extra delay in ms before the sweep starts. */
  delay?: number;
  lang?: string;
};

/** Marker-pen sweep behind inline text when it scrolls into view. */
export function MarkerHighlight({
  children,
  color = "var(--concept-soft)",
  delay = 0,
  lang,
}: MarkerHighlightProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  return (
    <mark
      ref={ref}
      lang={lang}
      data-on={inView}
      className="marker bg-transparent text-inherit"
      style={{ "--mark": color, transitionDelay: `${delay}ms` } as CSSProperties}
    >
      {children}
    </mark>
  );
}
