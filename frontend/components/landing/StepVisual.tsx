import { Download, FileUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PERSPECTIVES } from "@/lib/constants/content";

/** Small illustrative mock for each pipeline step (decorative). */
export function StepVisual({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <div className="space-y-3">
          <div className="border-input flex items-center gap-3 rounded-2xl border border-dashed p-5">
            <FileUp className="text-brand size-8" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium">proposal_v2.pdf</p>
              <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                <div className="bg-primary h-full w-4/5 rounded-full" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {["Type: Project proposal", "Year: 2026", "Dept: SWE", "Pages: 18"].map((m) => (
              <span key={m} className="bg-muted text-muted-foreground rounded-lg px-3 py-2">
                {m}
              </span>
            ))}
          </div>
        </div>
      );
    case 1:
      return (
        <div className="space-y-2.5 font-mono text-xs">
          <p className="text-muted-foreground line-through decoration-[var(--structural)]">
            DIU · Department of Software Engineering
          </p>
          {[92, 100, 84, 96, 70].map((w, i) => (
            <div key={i} className="bg-muted h-2.5 rounded-full" style={{ width: `${w}%` }} />
          ))}
          <p className="text-muted-foreground line-through decoration-[var(--structural)]">
            Page 12 of 48
          </p>
        </div>
      );
    case 2:
      return (
        <div className="space-y-2">
          {[
            ["Abstract", "EN"],
            ["Problem Statement", "BN"],
            ["Methodology", "Mixed"],
            ["Architecture", "EN"],
          ].map(([section, lang]) => (
            <div
              key={section}
              className="bg-muted flex items-center justify-between rounded-xl px-4 py-2.5 text-sm"
            >
              <span>{section}</span>
              <Badge
                variant={lang === "BN" ? "concept" : lang === "Mixed" ? "lexical" : "semantic"}
              >
                {lang}
              </Badge>
            </div>
          ))}
        </div>
      );
    case 3:
      return (
        <div>
          <div className="relative h-24">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-semantic-soft absolute top-0 h-14 w-[38%] rounded-xl border border-[color-mix(in_oklab,var(--semantic)_50%,transparent)]"
                style={{ left: `${i * 20}%`, top: `${(i % 2) * 28}px` }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5" aria-hidden>
            {Array.from({ length: 24 }, (_, i) => (
              <span
                key={i}
                className="bg-semantic size-2.5 rounded-full"
                style={{ opacity: 0.25 + ((i * 37) % 70) / 100 }}
              />
            ))}
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            ~300-word overlapping chunks → 1 vector each
          </p>
        </div>
      );
    case 4:
      return (
        <div className="space-y-3">
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <Badge>Top 20 chunks</Badge> → <Badge>Candidates</Badge> →{" "}
            <Badge variant="brand">Top 5</Badge>
          </div>
          {PERSPECTIVES.map((p, i) => (
            <div key={p.key} className="flex items-center gap-3 text-xs">
              <p.icon className="size-3.5 shrink-0" style={{ color: p.color }} aria-hidden />
              <span className="w-20">{p.name}</span>
              <div className="bg-muted h-2 flex-1 rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${[41, 78, 70, 65][i]}%`, background: p.color }}
                />
              </div>
            </div>
          ))}
        </div>
      );
    default:
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map((col) => (
              <div key={col} className="bg-muted space-y-1.5 rounded-xl p-3">
                {[90, 70, 85, 60].map((w, i) => (
                  <div
                    key={i}
                    className="h-2 rounded-full"
                    style={{
                      width: `${w}%`,
                      background: i === 1 || i === 2 ? "var(--concept)" : "var(--border)",
                      opacity: i === 1 || i === 2 ? 0.6 : 1,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="border-border flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm">
            <span>similarity-report.pdf</span>
            <Download className="text-brand size-4" aria-hidden />
          </div>
        </div>
      );
  }
}
