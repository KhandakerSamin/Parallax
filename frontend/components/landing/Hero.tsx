import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { HERO, SITE } from "@/lib/constants/content";
import { HeroReport } from "./HeroReport";
import { AuroraBackground } from "./shared/AuroraBackground";

/** CSS entrance (see .hero-rise) so the headline paints before JavaScript loads. */
const rise = (delayMs: number) => ({
  className: "hero-rise",
  style: { "--delay": `${delayMs}ms` } as CSSProperties,
});

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] items-center pt-28 pb-16 md:pt-32 md:pb-24"
    >
      <AuroraBackground />

      <div className="container-page grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div className="max-w-2xl">
          <div {...rise(0)}>
            <p className="glass border-border text-muted-foreground shadow-soft inline-flex max-w-full items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium sm:text-sm">
              <Sparkles className="text-brand size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{HERO.eyebrow}</span>
            </p>
          </div>

          <h1 id="hero-title" className="text-display hero-rise-lcp mt-5 text-balance">
            {HERO.titleStart}
            <span className="text-gradient hero-emphasis">
              {HERO.titleEmphasis}
              <svg
                aria-hidden
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
                className="pointer-events-none absolute -bottom-[0.08em] left-0 h-[0.18em] w-full overflow-visible"
              >
                <path
                  d="M2 8.5 C 50 2.5, 120 2.5, 198 7"
                  pathLength={1}
                  fill="none"
                  stroke="var(--brand)"
                  strokeOpacity={0.55}
                  strokeWidth={3}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="hero-underline"
                />
              </svg>
            </span>
          </h1>

          <p
            className="text-lead hero-rise text-muted-foreground mt-6 max-w-[60ch]"
            style={rise(160).style}
          >
            {SITE.oneLiner}
          </p>

          <div className="hero-rise mt-9 flex flex-col gap-3 sm:flex-row" style={rise(240).style}>
            <Button asChild size="lg">
              <Link href="/sign-up">
                {HERO.primaryCta}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="#how-it-works">{HERO.secondaryCta}</a>
            </Button>
          </div>

          <p
            className="hero-rise text-muted-foreground mt-7 flex items-center gap-2 text-sm"
            style={rise(320).style}
          >
            <ShieldCheck className="text-accent size-4 shrink-0" aria-hidden />
            {HERO.trust}
          </p>
        </div>

        <div className="hero-rise" style={rise(200).style}>
          <HeroReport />
        </div>
      </div>
    </section>
  );
}
