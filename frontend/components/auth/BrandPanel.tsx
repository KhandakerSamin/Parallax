"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/layout/Logo";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AUTH_HIGHLIGHTS, PERSPECTIVES, SITE } from "@/lib/constants/content";

/** Card that drifts slowly up and down (disabled for reduced motion). */
function DriftCard({
  className,
  delay,
  distance,
  children,
}: {
  className: string;
  delay: number;
  distance: number;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={className}
      animate={reduced ? undefined : { y: [0, -distance, 0] }}
      transition={{ duration: 9, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Right-hand panel on the auth pages: gradient mesh, drifting report cards, rotating highlights. */
export function BrandPanel() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % AUTH_HIGHLIGHTS.length), 4500);
    return () => clearInterval(timer);
  }, [reduced]);

  const highlight = AUTH_HIGHLIGHTS[index] ?? AUTH_HIGHLIGHTS[0];

  return (
    <div className="relative isolate hidden overflow-hidden bg-[#0b0f1a] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Gradient mesh */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="aurora-blob absolute -top-32 -left-24 size-[30rem] rounded-full bg-[#4f46e5] opacity-50 blur-[110px]" />
        <div
          className="aurora-blob absolute -right-24 bottom-0 size-[28rem] rounded-full bg-[#14b8a6] opacity-35 blur-[110px]"
          style={{ animationDelay: "-8s" }}
        />
        <div className="bg-grid absolute inset-0 opacity-40 [--grid-line:rgb(255_255_255/0.06)]" />
      </div>

      <div className="flex items-center gap-2.5">
        <LogoMark />
        <span className="text-lg font-semibold">Parallax</span>
      </div>

      {/* Floating layered report cards */}
      <div className="relative mx-auto h-72 w-full max-w-md">
        <DriftCard delay={0} distance={10} className="absolute top-0 right-0 w-64 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <p className="text-xs text-white/60">Top match</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-medium">
            <FileText className="size-4 text-[#a5b4fc]" />
            Smart Attendance System
          </p>
          <p className="mt-0.5 text-xs text-white/60">2023 · Project Report</p>
        </DriftCard>
        <DriftCard delay={1.5} distance={14} className="absolute top-16 left-0 w-72 rounded-2xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Similarity report</p>
            <span className="rounded-full bg-[#14b8a6]/20 px-2 py-0.5 text-[10px] text-[#5eead4]">Sample</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {PERSPECTIVES.map((p, i) => (
              <div key={p.key} className="flex items-center gap-2 text-xs">
                <span className="w-16 text-white/70">{p.name}</span>
                <div className="h-1.5 flex-1 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${[41, 86, 78, 69][i]}%`,
                      background: ["#fbbf24", "#a5b4fc", "#5eead4", "#fda4af"][i],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </DriftCard>
        <DriftCard delay={3} distance={8} className="absolute right-6 bottom-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
          <p className="text-xs text-white/60">Hybrid score</p>
          <p className="text-2xl font-semibold">0.72</p>
        </DriftCard>
      </div>

      <div>
        <div className="min-h-16" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
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
