"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { cn } from "@/lib/utils";

/** Height of the drag handle, in px. */
const THUMB = 44;

/**
 * Replaces the browser scrollbar with a slim gradient rail on the right edge.
 * The fill grows as you scroll, and a slim handle rides at its end: drag the
 * handle to scroll, or click anywhere on the rail to jump. Hidden when there is
 * nothing to scroll.
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
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 32, restDelta: 0.001 });
  // The handle travels the rail's height minus its own, so it never overhangs.
  const thumbTop = useTransform(progress, (p) => `calc(${p * 100}% - ${p * THUMB}px)`);
  const railRef = useRef<HTMLDivElement>(null);
  const grabOffset = useRef(THUMB / 2);
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
    const ratio = Math.min(1, Math.max(0, (clientY - grabOffset.current - top) / (height - THUMB)));
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
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    // Grabbing the handle keeps it under the pointer; clicking the track centres it there.
    const thumb = (event.target as HTMLElement).closest("[data-scroll-thumb]");
    grabOffset.current = thumb ? event.clientY - thumb.getBoundingClientRect().top : THUMB / 2;
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
        "group inset-y-0 right-0 z-[70] hidden w-4 cursor-pointer touch-none justify-end select-none sm:flex print:hidden",
        container ? "absolute" : "fixed",
        dragging && "cursor-grabbing",
        className,
      )}
    >
      {/* Track with the gradient fill */}
      <div className="bg-foreground/[0.06] relative mr-[3px] h-full w-1 overflow-hidden rounded-full">
        <motion.div
          className="via-primary absolute inset-0 origin-top bg-gradient-to-b from-[var(--lexical)] to-[var(--concept)]"
          style={{ scaleY: progress }}
        />
      </div>

      {/* Slim drag handle at the end of the fill */}
      <motion.div
        data-scroll-thumb
        style={{ top: thumbTop, height: THUMB }}
        className={cn(
          "bg-card ring-primary/40 absolute right-[1px] w-2 cursor-grab rounded-full shadow-md ring-1 transition-[width,box-shadow] duration-200 group-hover:w-2.5",
          dragging && "ring-primary w-2.5 cursor-grabbing ring-2",
        )}
      >
        <span className="via-primary absolute inset-[2px] rounded-full bg-gradient-to-b from-[var(--lexical)] to-[var(--concept)] opacity-80" />
      </motion.div>
    </div>
  );
}
