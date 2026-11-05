import { Hourglass } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/badge";
import { RESEARCH } from "@/lib/constants/content";
import { SectionHeader } from "./shared/SectionHeader";

// Scale colours step from neutral to strong as the label gets stronger.
const SCALE_STYLES = [
  "bg-muted text-muted-foreground",
  "bg-semantic-soft text-semantic",
  "bg-concept-soft text-concept",
  "bg-structural-soft text-structural",
];

export function Research() {
  return (
    <section id="research" aria-labelledby="research-title" className="py-24 md:py-32">
      <div className="container-page">
        <SectionHeader
          id="research-title"
          eyebrow="Research & evaluation"
          title={RESEARCH.title}
          intro={RESEARCH.intro}
        />

        <Reveal className="mt-8 flex justify-center">
          <Badge variant="lexical" className="px-4 py-1.5 text-sm">
            <Hourglass aria-hidden />
            {RESEARCH.status}
          </Badge>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Reveal className="border-border bg-card shadow-soft rounded-3xl border p-6 sm:p-8">
            <h3 className="text-h3">Models compared</h3>
            <Stagger as="ol" className="divide-border mt-6 divide-y" stagger={0.06}>
              {RESEARCH.models.map((model, i) => (
                <StaggerItem as="li" key={model.name} className="flex items-center gap-4 py-3.5">
                  <span className="text-muted-foreground font-mono text-xs">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium [overflow-wrap:anywhere]">{model.name}</p>
                    <p className="text-muted-foreground text-sm">{model.note}</p>
                  </div>
                  <span className="text-muted-foreground hidden text-xs sm:block">Pending</span>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>

          <div className="grid gap-4">
            <Reveal
              delay={0.05}
              className="border-border bg-card shadow-soft rounded-3xl border p-6 sm:p-8"
            >
              <h3 className="text-h3">Metrics</h3>
              <ul className="mt-5 flex flex-wrap gap-2">
                {RESEARCH.metrics.map((metric) => (
                  <li key={metric}>
                    <Badge variant="brand" className="px-3.5 py-1.5 text-sm">
                      {metric}
                    </Badge>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-4 text-sm">
                Spearman ρ measures how well score order agrees with human labels.
              </p>
            </Reveal>

            <Reveal
              delay={0.1}
              className="border-border bg-card shadow-soft rounded-3xl border p-6 sm:p-8"
            >
              <h3 className="text-h3">Human annotation scale</h3>
              <ol
                className="mt-5 grid grid-cols-4 gap-1.5 overflow-hidden rounded-2xl"
                aria-label="Annotation scale from 0 to 3"
              >
                {RESEARCH.scale.map((step, i) => (
                  <li
                    key={step.value}
                    className={`flex flex-col gap-1 px-2.5 py-3 ${SCALE_STYLES[i]}`}
                  >
                    <span className="text-2xl font-semibold">{step.value}</span>
                    <span className="text-[11px] leading-tight font-medium sm:text-xs">
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
