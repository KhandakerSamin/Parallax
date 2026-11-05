"use client";

import { ArrowUpRight, FileText, Search } from "lucide-react";
import { TiltPlane, TiltStage } from "@/components/motion/TiltCard";
import { Badge } from "@/components/ui/badge";
import { HERO, PERSPECTIVES } from "@/lib/constants/content";
import { ScoreBar } from "./shared/ScoreBar";
import { ScoreRing } from "./shared/ScoreRing";

const { report } = HERO;

/** The hero's signature visual: a layered mock report that tilts with the pointer. */
export function HeroReport() {
  return (
    <TiltStage className="relative mx-auto h-[33rem] w-full max-w-[30rem] sm:h-[34rem]">
      {/* Back plane: corpus search, farthest from the viewer */}
      <TiltPlane depth={8} className="absolute top-0 right-0 w-[78%]">
        <div className="rounded-2xl border border-border bg-card/70 p-4 opacity-80 shadow-soft backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Search className="size-3.5" aria-hidden /> Searching DIU corpus…
          </div>
          <div className="mt-3 space-y-2" aria-hidden>
            {[86, 64, 72].map((w) => (
              <div key={w} className="h-2 rounded-full bg-muted" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </TiltPlane>

      {/* Middle plane: perspective chips */}
      <TiltPlane depth={18} className="absolute top-14 left-0 w-[70%]">
        <div className="rounded-2xl border border-border bg-card/85 p-3.5 shadow-soft backdrop-blur-sm">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Four perspectives
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {PERSPECTIVES.map((p) => (
              <Badge key={p.key} variant={p.key} className="px-2.5 py-0.5">
                <p.icon aria-hidden />
                {p.name}
              </Badge>
            ))}
          </div>
        </div>
      </TiltPlane>

      {/* Front plane: the report */}
      <TiltPlane depth={34} className="absolute inset-x-[4%] bottom-0 sm:inset-x-[6%]">
        <div
          className="rounded-3xl border border-border bg-card p-5 shadow-lift sm:p-6"
          role="img"
          aria-label={`Sample similarity report: overall score ${report.overall}, top match ${report.match.title}, ${report.match.year}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{report.label}</p>
              <p className="text-xs text-muted-foreground">proposal_v2.pdf · 14 sections</p>
            </div>
            <Badge variant="accent">{report.sampleTag}</Badge>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <ScoreRing value={report.overall} size={104} label="Hybrid" />
            <div className="flex-1 space-y-2.5">
              {PERSPECTIVES.map((p, i) => (
                <ScoreBar
                  key={p.key}
                  perspective={p}
                  score={report.scores[p.key]}
                  delay={0.5 + i * 0.12}
                  compact
                />
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-muted p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-brand">
              <FileText className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{report.match.title}</p>
              <p className="text-xs text-muted-foreground">
                {report.match.year} · {report.match.type}
              </p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Top match</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-medium text-primary-foreground">
              View comparison <ArrowUpRight className="size-3.5" aria-hidden />
            </span>
            <span className="inline-flex h-9 items-center justify-center rounded-full border border-border text-xs font-medium">
              View evidence
            </span>
          </div>
        </div>
      </TiltPlane>
    </TiltStage>
  );
}
