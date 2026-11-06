"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Replaces the browser scrollbar with a thin gradient rail on the right edge,
 * styled like the top scroll-progress bar. The fill grows as you scroll; click or
 * drag anywhere on the rail to jump. Hidden when the page doesn't scroll.
 */
export function ScrollRail() {
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const railRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const check = () => setScrollable(root.scrollHeight > window.innerHeight + 4);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(document.body);
    window.addEventListener("resize", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", check);
    };
  }, []);

  const seek = (clientY: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const { top, height } = rail.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientY - top) / height));
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: ratio * max, behavior: "instant" });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    seek(event.clientY);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging) seek(event.clientY);
  };
  const stopDrag = () => setDragging(false);

  if (!scrollable) return null;

  return (
    <div
      ref={railRef}
      aria-hidden
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      className="group fixed inset-y-0 right-0 z-[70] hidden w-3 cursor-pointer touch-none justify-end select-none sm:flex"
    >
      <div
        className={cn(
          "bg-foreground/[0.06] relative h-full w-[3px] overflow-hidden transition-[width] duration-200 group-hover:w-[6px]",
          dragging && "w-[6px]",
        )}
      >
        <motion.div
          className="via-primary absolute inset-0 origin-top bg-gradient-to-b from-[var(--lexical)] to-[var(--concept)]"
          style={{ scaleY }}
        />
      </div>
    </div>
  );
}
