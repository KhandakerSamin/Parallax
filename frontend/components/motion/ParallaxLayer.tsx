"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ParallaxLayerProps = {
  children?: ReactNode;
  className?: string;
  /** Pixels travelled across the element's pass through the viewport. Negative = moves up. */
  distance?: number;
};

/** Scroll-linked vertical drift; layers with different distances create depth. */
export function ParallaxLayer({ children, className, distance = 80 }: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-distance / 2, distance / 2]);

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
