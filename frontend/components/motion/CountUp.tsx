"use client";

import { animate, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type CountUpProps = {
  value: number;
  /** Text after the number, e.g. "+". */
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
};

function format(n: number, decimals: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Counts from 0 to `value` once visible. Screen readers get the final value. */
export function CountUp({ value, suffix = "", decimals = 0, duration = 1.6, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [inView, reduced, value, duration]);

  // Reduced motion: show the final number immediately, no count-up.
  const shown = reduced ? value : display;

  return (
    <span ref={ref} className={className}>
      <span aria-hidden className="tabular-nums">
        {format(shown, decimals)}
        {suffix}
      </span>
      <span className="sr-only">
        {format(value, decimals)}
        {suffix}
      </span>
    </span>
  );
}
