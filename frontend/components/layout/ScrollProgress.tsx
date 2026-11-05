"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/** Thin gradient bar at the very top showing how far down the page you are. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className="via-primary fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-[var(--lexical)] to-[var(--concept)]"
      style={{ scaleX }}
    />
  );
}
