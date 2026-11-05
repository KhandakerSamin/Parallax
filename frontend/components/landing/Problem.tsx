import { ArrowRight, Check } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { PROBLEM } from "@/lib/constants/content";
import { SectionHeader } from "./shared/SectionHeader";

export function Problem() {
  return (
    <section id="features" aria-labelledby="problem-title" className="py-24 md:py-32">
      <div className="container-page">
        <SectionHeader id="problem-title" eyebrow="The problem" title={PROBLEM.title} intro={PROBLEM.intro} />

        <Stagger as="ul" className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEM.cards.map((card) => (
            <StaggerItem as="li" key={card.title}>
              <SpotlightCard className="h-full p-6 transition-transform duration-300 hover:-translate-y-1">
                <span className="grid size-11 place-items-center rounded-xl bg-muted text-brand">
                  <card.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Before vs after: one bare number vs a panel of evidence */}
        <Reveal className="mt-14 grid items-center gap-4 md:grid-cols-[1fr_auto_1.6fr]">
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border p-8 text-center">
            <span className="text-6xl font-semibold tracking-tight text-muted-foreground/70">
              {PROBLEM.before.score}
            </span>
            <span className="mt-2 text-sm text-muted-foreground">{PROBLEM.before.caption}</span>
          </div>
          <ArrowRight className="mx-auto size-6 rotate-90 text-muted-foreground md:rotate-0" aria-hidden />
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <p className="text-sm font-semibold">{PROBLEM.after.caption}</p>
            <ul className="mt-4 space-y-2.5">
              {PROBLEM.after.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-concept-soft text-concept">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
