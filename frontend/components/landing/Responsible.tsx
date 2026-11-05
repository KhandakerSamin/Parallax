import { CheckCircle2 } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { RESPONSIBLE } from "@/lib/constants/content";

export function Responsible() {
  const Icon = RESPONSIBLE.icon;
  return (
    <section aria-labelledby="responsible-title" className="py-24 md:py-32">
      <div className="container-page">
        <Reveal className="relative overflow-hidden rounded-[2rem] border border-[color-mix(in_oklab,var(--concept)_35%,var(--border))] bg-card p-6 shadow-lift sm:p-10 lg:p-14">
          <div
            aria-hidden
            className="absolute -top-24 -right-24 size-72 rounded-full bg-[#14b8a6] opacity-15 blur-3xl"
          />
          <div className="relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="grid size-14 place-items-center rounded-2xl bg-concept-soft text-concept">
                <Icon className="size-7" aria-hidden />
              </span>
              <h2 id="responsible-title" className="text-h2 mt-6 text-balance">
                {RESPONSIBLE.title}
              </h2>
              <p className="text-lead mt-4 text-muted-foreground">
                A similarity score is a starting point for a conversation, not a judgement about a
                person.
              </p>
            </div>
            <Stagger as="ul" className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {RESPONSIBLE.principles.map((p) => (
                <StaggerItem as="li" key={p.title} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-concept" aria-hidden />
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
