"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { FileText } from "lucide-react";
import { useEffect, useState, type PointerEvent, type ReactNode } from "react";
import { LogoMark } from "@/components/layout/Logo";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AUTH_HIGHLIGHTS, PERSPECTIVES, SITE } from "@/lib/constants/content";

const BAR_COLORS = ["#fbbf24", "#a5b4fc", "#5eead4", "#fda4af"];

/** Sample reports the preview cycles through, one per highlight. Illustrative only. */
const SAMPLES = [
  { title: "Smart Attendance System", year: "2023", bars: [41, 86, 78, 69], hybrid: 0.72 },
  { title: "Bangla News Classifier", year: "2024", bars: [12, 91, 74, 52], hybrid: 0.68 },
  { title: "Crop Disease Detection", year: "2024", bars: [35, 64, 88, 47], hybrid: 0.61 },
  { title: "Blood Donor Network", year: "2025", bars: [18, 57, 49, 83], hybrid: 0.54 },
];

/**
 * A layer that drifts slowly up and down and shifts with the pointer; `depth`
 * sets how far it moves, so nearer cards move more (a parallax effect).
 */
function Layer({
  className,
  depth,
  delay,
  pointer,
  reduced,
  children,
}: {
  className: string;
  depth: number;
  delay: number;
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
  reduced: boolean;
  children: ReactNode;
}) {
  const x = useTransform(pointer.x, (v) => v * depth);
  const y = useTransform(pointer.y, (v) => v * depth);
  return (
    <motion.div aria-hidden className={className} style={reduced ? undefined : { x, y }}>
      <motion.div
        animate={reduced ? undefined : { y: [0, -depth * 0.6, 0] }}
        transition={{ duration: 8 + depth / 4, delay, repeat: Infinity, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Number that glides to each new value instead of jumping. */
function AnimatedScore({ value, reduced }: { value: number; reduced: boolean }) {
  const score = useMotionValue(value);
  const text = useTransform(score, (v) => v.toFixed(2));
  useEffect(() => {
    if (reduced) {
      score.set(value);
      return;
    }
    const controls = animate(score, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [score, value, reduced]);
  return <motion.span>{text}</motion.span>;
}

/**
 * Right-hand panel on the auth pages. It stays fixed while the form scrolls:
 * a gradient mesh, orbit rings, and a stack of report cards that tilt with the
 * pointer and refresh with each rotating highlight.
 */
export function BrandPanel() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const pointer = {
    x: useSpring(rawX, { stiffness: 60, damping: 18 }),
    y: useSpring(rawY, { stiffness: 60, damping: 18 }),
  };
  const rotateX = useTransform(pointer.y, (v) => -v * 0.35);
  const rotateY = useTransform(pointer.x, (v) => v * 0.35);

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % AUTH_HIGHLIGHTS.length), 4500);
    return () => clearInterval(timer);
  }, [reduced]);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    // -1..1 from the panel's centre
    rawX.set(((event.clientX - rect.left) / rect.width - 0.5) * 2);
    rawY.set(((event.clientY - rect.top) / rect.height - 0.5) * 2);
  };
  const onPointerLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  const highlight = AUTH_HIGHLIGHTS[index] ?? AUTH_HIGHLIGHTS[0];
  const sample = SAMPLES[index % SAMPLES.length] ?? SAMPLES[0]!;

  return (
    <div
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative isolate hidden overflow-hidden bg-[#0b0f1a] text-white lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:p-12"
    >
      {/* Gradient mesh */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="aurora-blob absolute -top-32 -left-24 size-[30rem] rounded-full bg-[#4f46e5] opacity-50 blur-[110px]" />
        <div
          className="aurora-blob absolute -right-24 bottom-0 size-[28rem] rounded-full bg-[#14b8a6] opacity-35 blur-[110px]"
          style={{ animationDelay: "-8s" }}
        />
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)] opacity-40 [--grid-line:rgb(255_255_255/0.06)]" />
      </div>

      <div className="flex items-center gap-2.5">
        <LogoMark />
        <span className="text-lg font-semibold">Parallax</span>
      </div>

      {/* Card stack with orbit rings behind it */}
      <div className="relative mx-auto h-80 w-full max-w-md [perspective:1200px]">
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[26rem] -translate-x-1/2 -translate-y-1/2"
        >
          <div className="brand-orbit absolute inset-0 rounded-full border border-dashed border-white/10">
            <span className="absolute -top-1 left-1/2 size-2 rounded-full bg-[#a5b4fc] shadow-[0_0_12px_#a5b4fc]" />
          </div>
          <div className="brand-orbit-reverse absolute inset-12 rounded-full border border-white/[0.07]">
            <span className="absolute top-1/2 -right-1 size-1.5 rounded-full bg-[#5eead4] shadow-[0_0_10px_#5eead4]" />
          </div>
        </div>

        <motion.div
          className="absolute inset-0 [transform-style:preserve-3d]"
          style={reduced ? undefined : { rotateX, rotateY }}
        >
          <Layer
            depth={10}
            delay={0}
            pointer={pointer}
            reduced={reduced}
            className="absolute top-0 right-0 w-64"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <p className="text-xs text-white/60">Top match</p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={sample.title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35 }}
                >
                  <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                    <FileText className="size-4 text-[#a5b4fc]" />
                    {sample.title}
                  </p>
                  <p className="mt-0.5 text-xs text-white/60">{sample.year} · Project Report</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </Layer>

          <Layer
            depth={22}
            delay={1.5}
            pointer={pointer}
            reduced={reduced}
            className="absolute top-24 left-0 w-72"
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
              <span
                aria-hidden
                className="brand-scan pointer-events-none absolute inset-x-0 h-12"
              />
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Similarity report</p>
                <span className="rounded-full bg-[#14b8a6]/20 px-2 py-0.5 text-[10px] text-[#5eead4]">
                  Sample
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {PERSPECTIVES.map((p, i) => (
                  <div key={p.key} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-white/70">{p.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: BAR_COLORS[i] }}
                        initial={false}
                        animate={{ width: `${sample.bars[i]}%` }}
                        transition={
                          reduced
                            ? { duration: 0 }
                            : { duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }
                        }
                      />
                    </div>
                    <span className="w-7 text-right text-white/60 tabular-nums">
                      {sample.bars[i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Layer>

          <Layer
            depth={32}
            delay={3}
            pointer={pointer}
            reduced={reduced}
            className="absolute right-6 bottom-0"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-[0_0_40px_-12px_#5eead4] backdrop-blur-md">
              <p className="text-xs text-white/60">Hybrid score</p>
              <p className="text-2xl font-semibold tabular-nums">
                <AnimatedScore value={sample.hybrid} reduced={reduced} />
              </p>
            </div>
          </Layer>
        </motion.div>
      </div>

      <div>
        <div className="min-h-16" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.45 }}
              className="flex items-start gap-3 text-xl leading-snug font-medium text-balance"
            >
              <highlight.icon className="mt-1 size-5 shrink-0 text-[#5eead4]" aria-hidden />
              {highlight.text}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="mt-6 flex gap-1.5" aria-hidden>
          {AUTH_HIGHLIGHTS.map((h, i) => (
            <span
              key={h.text}
              className={`h-1 rounded-full transition-all duration-500 ${i === index ? "w-8 bg-white" : "w-3 bg-white/30"}`}
            />
          ))}
        </div>
        <p className="mt-8 text-xs text-white/55">
          {SITE.course} · {SITE.university}
        </p>
      </div>
    </div>
  );
}
