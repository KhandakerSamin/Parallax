"use client";

import { FileText, Info, Lightbulb } from "lucide-react";
import { MarkerHighlight } from "@/components/motion/MarkerHighlight";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EXPLAIN, type Segment } from "@/lib/constants/content";
import { SectionHeader } from "./shared/SectionHeader";

function Passage({ segments }: { segments: readonly Segment[] }) {
  let markIndex = 0;
  return (
    <p className="text-[15px] leading-8 sm:text-base">
      {segments.map((seg, i) =>
        seg.mark ? (
          <MarkerHighlight key={i} lang={seg.lang} delay={markIndex++ * 180}>
            {seg.text}
          </MarkerHighlight>
        ) : (
          <span key={i} lang={seg.lang}>
            {seg.text}
          </span>
        ),
      )}
    </p>
  );
}

function DocPanel({
  title,
  meta,
  segments,
  accent,
}: {
  title: string;
  meta: string;
  segments: readonly Segment[];
  accent?: boolean;
}) {
  return (
    <div className="border-border bg-card shadow-soft rounded-2xl border p-5 sm:p-6">
      <div className="border-border flex items-center gap-3 border-b pb-4">
        <span
          className={
            accent
              ? "bg-concept-soft text-concept grid size-9 place-items-center rounded-xl"
              : "bg-semantic-soft text-brand grid size-9 place-items-center rounded-xl"
          }
        >
          <FileText className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-muted-foreground text-xs">{meta}</p>
        </div>
      </div>
      <div className="pt-4">
        <Passage segments={segments} />
      </div>
    </div>
  );
}

export function Explainability() {
  return (
    <section id="evidence" aria-labelledby="evidence-title" className="py-24 md:py-32">
      <div className="container-page">
        <SectionHeader
          id="evidence-title"
          eyebrow="Explainability"
          title={EXPLAIN.title}
          intro={EXPLAIN.intro}
        />

        <Reveal className="mt-14">
          <Tabs defaultValue={EXPLAIN.tabs[0]?.id ?? "problem"}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <TabsList aria-label="Document sections">
                {EXPLAIN.tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <span className="text-muted-foreground flex items-center gap-2 text-xs">
                <span
                  className="bg-concept-soft inline-block h-3 w-6 rounded-sm ring-1 ring-[var(--concept)]/30"
                  aria-hidden
                />
                Shared evidence
              </span>
            </div>

            {EXPLAIN.tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id}>
                <div className="grid gap-4 md:grid-cols-2">
                  <DocPanel
                    title={EXPLAIN.yoursLabel}
                    meta={`${tab.label} · English`}
                    segments={tab.yours}
                  />
                  <DocPanel
                    accent
                    title={EXPLAIN.matchedLabel}
                    meta={`${tab.label} · ${tab.matched.some((s) => s.lang === "bn") ? "Bangla-English mixed" : "English"}`}
                    segments={tab.matched}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Reveal>

        <Reveal className="mt-4">
          <div className="border-border bg-card shadow-soft rounded-2xl border p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Lightbulb className="text-lexical size-5" aria-hidden />
              {EXPLAIN.why.title}
            </h3>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {EXPLAIN.why.groups.map((group) => (
                <div key={group.label}>
                  <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {group.label}
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {group.chips.map((chip) => (
                      <Badge
                        key={chip}
                        variant={group.label === "Architecture" ? "structural" : "concept"}
                      >
                        {chip}
                      </Badge>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground mt-6 flex items-center gap-2 text-xs">
              <Info className="size-3.5" aria-hidden />
              {EXPLAIN.sampleNote}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
