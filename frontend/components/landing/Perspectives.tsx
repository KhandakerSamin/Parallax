import type { ReactNode } from "react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { PERSPECTIVES, type PerspectiveKey } from "@/lib/constants/content";
import { cn } from "@/lib/utils";
import {
  ConceptVisual,
  LexicalVisual,
  SemanticVisual,
  StructuralVisual,
} from "./PerspectiveVisuals";
import { ScorePlayground } from "./ScorePlayground";
import { SectionHeader } from "./shared/SectionHeader";

const VISUALS: Record<PerspectiveKey, ReactNode> = {
  lexical: <LexicalVisual />,
  semantic: <SemanticVisual />,
  concept: <ConceptVisual />,
  structural: <StructuralVisual />,
};

// Bento layout: wide cards alternate so the grid reads as a pattern, not a table.
const SPANS: Record<PerspectiveKey, string> = {
  lexical: "lg:col-span-2",
  semantic: "lg:col-span-3",
  concept: "lg:col-span-3",
  structural: "lg:col-span-2",
};

export function Perspectives() {
  return (
    <section id="perspectives" aria-labelledby="perspectives-title" className="py-24 md:py-32">
      <div className="container-page">
        <SectionHeader
          id="perspectives-title"
          eyebrow="Four perspectives"
          title={
            <>
              Four lenses. <span className="text-gradient">One honest score.</span>
            </>
          }
          intro="Each perspective catches a different kind of similarity. Together they give a fuller picture than any one of them alone."
        />

        <Stagger as="ul" className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {PERSPECTIVES.map((p) => (
            <StaggerItem as="li" key={p.key} className={cn(SPANS[p.key])}>
              <SpotlightCard spotColor={p.color} className="flex h-full flex-col p-6">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-11 place-items-center rounded-xl"
                    style={{ background: p.soft, color: p.color }}
                  >
                    <p.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="text-xl font-semibold tracking-tight">{p.name}</h3>
                </div>
                <p className="text-muted-foreground mt-4">{p.measures}</p>
                <p className="mt-2 text-sm">
                  <span className="font-medium">Method: </span>
                  <span className="text-muted-foreground">{p.method}</span>
                </p>
                <div className="mt-auto pt-6">{VISUALS[p.key]}</div>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mt-10">
          <ScorePlayground />
        </Reveal>
      </div>
    </section>
  );
}
