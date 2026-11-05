"use client";

import { MotionConfig } from "framer-motion";
import Lenis from "lenis";
import { useEffect, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Global motion settings: framer-motion follows the OS reduced-motion setting,
 * and Lenis smooth scrolling runs only when motion is allowed.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.1,
      // Smooth in-page anchor links, offset for the sticky navbar.
      anchors: { offset: -80 },
    });
    return () => lenis.destroy();
  }, [reduced]);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
