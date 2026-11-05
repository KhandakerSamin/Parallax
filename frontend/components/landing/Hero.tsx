"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HERO, SITE } from "@/lib/constants/content";
import { HeroReport } from "./HeroReport";
import { AuroraBackground } from "./shared/AuroraBackground";

const EASE = [0.22, 1, 0.36, 1] as const;
const rise = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: EASE },
});

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] items-center pt-28 pb-16 md:pt-32 md:pb-24"
    >
      <AuroraBackground />

      <div className="container-page grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div className="max-w-2xl">
          <motion.p
            {...rise(0)}
            className="glass inline-flex max-w-full items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-soft sm:text-sm"
          >
            <Sparkles className="size-3.5 shrink-0 text-brand" aria-hidden />
            <span className="truncate">{HERO.eyebrow}</span>
          </motion.p>

          <motion.h1 {...rise(0.08)} id="hero-title" className="text-display mt-6 text-balance">
            {HERO.titleStart}
            <span className="text-gradient">{HERO.titleEmphasis}</span>
          </motion.h1>

          <motion.p {...rise(0.16)} className="text-lead mt-6 max-w-[60ch] text-muted-foreground">
            {SITE.oneLiner}
          </motion.p>

          <motion.div {...rise(0.24)} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/sign-up">
                {HERO.primaryCta}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="#how-it-works">{HERO.secondaryCta}</a>
            </Button>
          </motion.div>

          <motion.p
            {...rise(0.32)}
            className="mt-7 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <ShieldCheck className="size-4 shrink-0 text-accent" aria-hidden />
            {HERO.trust}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: EASE }}
        >
          <HeroReport />
        </motion.div>
      </div>
    </section>
  );
}
