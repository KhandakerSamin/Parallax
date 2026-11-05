"use client";

import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * Soft drifting colour blobs over a faint grid. The blobs move slower than the page
 * when scrolling (parallax) and pause entirely when off-screen.
 */
export function AuroraBackground({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "0px" });
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, 180]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        !inView && "aurora-paused",
        className,
      )}
    >
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]" />
      <motion.div style={{ y }} className="absolute inset-0">
        <div className="aurora-blob absolute -top-40 left-[8%] size-[34rem] rounded-full bg-[#4f46e5] opacity-[0.22] blur-[110px] dark:opacity-[0.28]" />
        <div
          className="aurora-blob absolute top-10 right-[4%] size-[30rem] rounded-full bg-[#14b8a6] opacity-[0.18] blur-[110px] dark:opacity-[0.2]"
          style={{ animationDelay: "-7s" }}
        />
        <div
          className="aurora-blob absolute top-[45%] left-[38%] size-[24rem] rounded-full bg-[#f43f5e] opacity-[0.1] blur-[120px] dark:opacity-[0.12]"
          style={{ animationDelay: "-14s" }}
        />
      </motion.div>
      <div className="to-background absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent" />
    </div>
  );
}
