"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { STEPS } from "@/lib/constants/content";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./shared/SectionHeader";
import { StepVisual } from "./StepVisual";

export function HowItWorks() {
  const listRef = useRef<HTMLOListElement>(null);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 60%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  // The active step is whichever one crosses the middle band of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const current = STEPS[active] ?? STEPS[0]!;

  return (
    <section id="how-it-works" aria-labelledby="how-title" className="py-24 md:py-32">
      <div className="container-page">
        <SectionHeader
          id="how-title"
          eyebrow="How it works"
          title="From upload to evidence in six steps."
          intro="Each document goes through the same deterministic pipeline, so the same input always gives the same result."
        />

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          {/* Pinned visual (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-32">
              <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-lift">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    Step {String(active + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
                  </span>
                  <span className="flex gap-1" aria-hidden>
                    {STEPS.map((s, i) => (
                      <span
                        key={s.title}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-500",
                          i === active ? "w-6 bg-primary" : "w-1.5 bg-border",
                        )}
                      />
                    ))}
                  </span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-8"
                    aria-live="polite"
                  >
                    <span className="grid size-14 place-items-center rounded-2xl bg-semantic-soft text-brand">
                      <current.icon className="size-7" aria-hidden />
                    </span>
                    <h3 className="text-h3 mt-6">{current.title}</h3>
                    <div className="mt-6 min-h-52">
                      <StepVisual index={active} />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Steps with scroll-linked progress line */}
          <div className="relative">
            <div aria-hidden className="absolute top-2 bottom-2 left-[19px] w-0.5 rounded-full bg-border">
              <motion.div
                className="size-full origin-top rounded-full bg-gradient-to-b from-primary to-[var(--concept)]"
                style={{ scaleY: progress }}
              />
            </div>
            <ol ref={listRef} className="relative space-y-6 lg:space-y-0">
              {STEPS.map((step, i) => {
                const done = i < active;
                const isActive = i === active;
                return (
                  <li
                    key={step.title}
                    ref={(el) => {
                      stepRefs.current[i] = el;
                    }}
                    data-index={i}
                    className="relative flex gap-5 lg:min-h-[52vh] lg:items-center"
                  >
                    <span
                      className={cn(
                        "relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 bg-background text-sm font-semibold transition-colors duration-300",
                        isActive && "border-primary text-brand",
                        done && "border-primary bg-primary text-primary-foreground",
                        !isActive && !done && "border-border text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
                    </span>
                    <div
                      className={cn(
                        "pb-2 transition-opacity duration-500 lg:pb-0",
                        isActive ? "opacity-100" : "lg:opacity-45",
                      )}
                    >
                      <h3 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
                        <step.icon className="size-5 text-brand lg:hidden" aria-hidden />
                        {step.title}
                      </h3>
                      <p className="mt-2 max-w-[52ch] text-muted-foreground">{step.summary}</p>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {step.details.map((d) => (
                          <li key={d} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                            {d}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5 rounded-2xl border border-border bg-card p-5 lg:hidden">
                        <StepVisual index={i} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
