"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { MULTILINGUAL } from "@/lib/constants/content";

const EASE = [0.22, 1, 0.36, 1] as const;

// Final positions (% of the plot) and where each card drifts in from (px).
const LAYOUT = {
  en: { left: "4%", top: "8%", from: { x: -40, y: -50 } },
  bn: { left: "34%", top: "33%", from: { x: 70, y: -30 } },
  banglish: { left: "6%", top: "52%", from: { x: -50, y: 60 } },
} as const;

export function Multilingual() {
  return (
    <section aria-labelledby="multilingual-title" className="py-24 md:py-32">
      <div className="container-page grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <p className="text-brand text-sm font-semibold tracking-wide uppercase">Multilingual</p>
          <h2 id="multilingual-title" className="text-h2 mt-3 text-balance">
            {MULTILINGUAL.title}
          </h2>
          <p className="text-lead text-muted-foreground mt-5 max-w-[60ch]">{MULTILINGUAL.body}</p>
          <ul className="mt-8 space-y-3">
            {MULTILINGUAL.points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="bg-concept-soft text-concept mt-1 grid size-5 shrink-0 place-items-center rounded-full">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1}>
          <figure className="border-border bg-card shadow-lift rounded-3xl border p-4 sm:p-6">
            <div className="bg-grid bg-muted/50 relative h-[27rem] overflow-hidden rounded-2xl sm:h-[25rem]">
              {/* Neighbourhood where the three phrasings land */}
              <motion.div
                aria-hidden
                className="bg-semantic-soft/60 absolute top-[4%] left-[1%] h-[80%] w-[82%] rounded-[45%] border-2 border-dashed border-[color-mix(in_oklab,var(--semantic)_45%,transparent)]"
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-20% 0px" }}
                transition={{ duration: 0.8, delay: 1.1, ease: EASE }}
              />

              {MULTILINGUAL.phrases.map((phrase, i) => {
                const pos = LAYOUT[phrase.id];
                return (
                  <motion.div
                    key={phrase.id}
                    className="absolute max-w-[56%] sm:max-w-[48%]"
                    style={{ left: pos.left, top: pos.top }}
                    initial={{ opacity: 0, x: pos.from.x, y: pos.from.y }}
                    whileInView={{ opacity: 1, x: 0, y: 0 }}
                    viewport={{ once: true, margin: "-20% 0px" }}
                    transition={{ duration: 1.2, delay: 0.2 + i * 0.15, ease: EASE }}
                  >
                    <div className="border-border bg-card shadow-soft flex items-start gap-2 rounded-xl border px-3 py-2">
                      <span
                        className="bg-semantic mt-1.5 size-2.5 shrink-0 rounded-full"
                        aria-hidden
                      />
                      <div>
                        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                          {phrase.label}
                        </p>
                        <p lang={phrase.lang} className="text-xs leading-snug sm:text-sm">
                          {phrase.text}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              <motion.div
                className="absolute max-w-[44%]"
                style={{ right: "4%", bottom: "6%" }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <div className="border-border bg-card/80 flex items-start gap-2 rounded-xl border border-dashed px-3 py-2">
                  <span
                    className="bg-muted-foreground mt-1.5 size-2.5 shrink-0 rounded-full"
                    aria-hidden
                  />
                  <div>
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                      {MULTILINGUAL.outlier.label}
                    </p>
                    <p className="text-muted-foreground text-xs leading-snug sm:text-sm">
                      {MULTILINGUAL.outlier.text}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
            <figcaption className="text-muted-foreground mt-3 text-center text-xs">
              {MULTILINGUAL.caption}
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
