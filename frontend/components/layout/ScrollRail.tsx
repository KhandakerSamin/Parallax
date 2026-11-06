"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { cn } from "@/lib/utils";

/**
 * Replaces the browser scrollbar with a thin gradient rail on the right edge,
 * styled like the top scroll-progress bar. The fill grows as you scroll; click or
 * drag anywhere on the rail to jump. Hidden when there is nothing to scroll.
 *
 * Without `container` it tracks the page. With `container` it tracks that element
 * and sits on its right edge (the parent must be `position: relative`).
 */
export function ScrollRail({
  container,
  className,
}: {
  container?: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const { scrollYProgress } = useScroll(container ? { container } : undefined);
  const scaleY = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const railRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const target = container?.current ?? document.documentElement;
    const check = () => {
      const visible = container ? target.clientHeight : window.innerHeight;
      setScrollable(target.scrollHeight > visible + 4);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(container ? target : document.body);
    if (container && target.firstElementChild) observer.observe(target.firstElementChild);
    window.addEventListener("resize", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [container]);

  const seek = (clientY: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const { top, height } = rail.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientY - top) / height));
    const target = container?.current;
    if (target) {
      target.scrollTo({
        top: ratio * (target.scrollHeight - target.clientHeight),
        behavior: "instant",
      });
    } else {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: ratio * max, behavior: "instant" });
    }
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
      className={cn(
        "group inset-y-0 right-0 z-[70] hidden w-3 cursor-pointer touch-none justify-end select-none sm:flex",
        container ? "absolute" : "fixed",
        className,
      )}
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
