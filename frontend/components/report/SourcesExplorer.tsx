"use client";

import { ExternalLink, Languages } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { PerspectiveBar, PerspectiveMiniBar } from "@/components/app/charts";
import { EmptyState, Panel } from "@/components/app/ui";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Evidence, Match } from "@/lib/analysis/types";
import { isMostlyBangla, langProps, pct } from "@/lib/app/format";
import { PERSPECTIVE, PERSPECTIVES, type PerspectiveKey } from "@/lib/app/terms";
import { cn } from "@/lib/utils";

type SortKey = "hybrid" | PerspectiveKey;

const SORTS: { value: SortKey; label: string }[] = [
  { value: "hybrid", label: "Combined score" },
  ...PERSPECTIVES.map((p) => ({ value: p.key, label: p.name })),
];

function hybrid(match: Match): number {
  return match.hybrid ?? match.overall;
}

function crossesLanguage(evidence: Evidence[]): boolean {
  return evidence.some((e) => isMostlyBangla(e.submitted.text) !== isMostlyBangla(e.source.text));
}

function CrossLanguageBadge() {
  return (
    <span className="border-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium">
      <Languages className="size-3" aria-hidden />
      Cross-language
    </span>
  );
}

/** The matching sources as a ranked list (left) and the selected one's detail (right). */
export function SourcesExplorer({
  matches,
  narrow = false,
}: {
  matches: Match[];
  narrow?: boolean;
}) {
  const bp = narrow ? "2xl" : "lg";
  const [sort, setSort] = useState<SortKey>("hybrid");
  const sorted = useMemo(
    () =>
      [...matches].sort((a, b) =>
        sort === "hybrid" ? hybrid(b) - hybrid(a) : (b.scores[sort] ?? 0) - (a.scores[sort] ?? 0),
      ),
    [matches, sort],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sorted.find((m) => m.source.id === selectedId) ?? sorted[0] ?? null;

  if (!matches.length) {
    return (
      <Panel title="Matching sources">
        <EmptyState
          title="No similar report found"
          body="Nothing in the 1,925-report corpus stood out as similar to this text."
        />
      </Panel>
    );
  }

  return (
    <section
      aria-labelledby="sources-title"
      className={cn("grid gap-4", bp === "lg" ? "lg:grid-cols-12" : "2xl:grid-cols-12")}
    >
      <div className={bp === "lg" ? "lg:col-span-4" : "2xl:col-span-4"}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="sources-title" className="text-base font-semibold tracking-tight">
            Matching sources{" "}
            <span className="text-muted-foreground font-normal">({matches.length})</span>
          </h2>
          <div className="text-muted-foreground flex items-center gap-2 text-xs print:hidden">
            <span aria-hidden>Sort</span>
            <Select
              size="sm"
              aria-label="Sort sources"
              value={sort}
              onValueChange={setSort}
              options={SORTS}
            />
          </div>
        </div>
        <ul
          className={cn(
            "no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1",
            bp === "lg"
              ? "lg:mx-0 lg:block lg:space-y-2 lg:overflow-visible lg:px-0"
              : "2xl:mx-0 2xl:block 2xl:space-y-2 2xl:overflow-visible 2xl:px-0",
          )}
          aria-label="Sources"
        >
          {sorted.map((match, i) => {
            const active = match === selected;
            const meta = [match.source.year, match.source.type].filter(Boolean).join(" · ");
            return (
              <li
                key={match.source.id}
                className={cn(
                  "w-[78%] shrink-0 snap-start sm:w-[46%]",
                  bp === "lg" ? "lg:w-auto" : "md:w-[40%] 2xl:w-auto",
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(match.source.id)}
                  aria-pressed={active}
                  className={cn(
                    "w-full cursor-pointer rounded-2xl border p-4 text-left transition-colors",
                    active
                      ? "border-primary/50 bg-semantic-soft/50 ring-primary/20 ring-2"
                      : "border-border bg-card hover:border-primary/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground font-mono text-xs">#{i + 1}</span>
                    <span className="text-lg leading-none font-semibold tabular-nums">
                      {pct(sort === "hybrid" ? hybrid(match) : match.scores[sort])}
                    </span>
                  </div>
                  <p
                    {...langProps(match.source.title)}
                    className="bn-aware clamp-2 mt-1.5 text-sm font-medium"
                  >
                    {match.source.title}
                  </p>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {meta && <span>{meta}</span>}
                    {crossesLanguage(match.evidence) && <CrossLanguageBadge />}
                  </div>
                  <PerspectiveMiniBar scores={match.scores} className="mt-3" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={bp === "lg" ? "lg:col-span-8" : "2xl:col-span-8"}>
        {selected && <SourceDetail key={selected.source.id} match={selected} />}
      </div>
    </section>
  );
}

function SourceDetail({ match }: { match: Match }) {
  const meta = [match.source.year, match.source.type].filter(Boolean).join(" · ");
  return (
    <Panel bodyClassName="pt-5 sm:pt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Selected source</p>
          <h3 {...langProps(match.source.title)} className="bn-aware mt-1 text-lg font-semibold">
            {match.source.title}
          </h3>
          {meta && <p className="text-muted-foreground mt-0.5 text-sm">{meta}</p>}
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold tabular-nums">{pct(hybrid(match))}</p>
          <p className="text-muted-foreground text-xs">combined score for this source</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PERSPECTIVES.map((p, i) => (
          <PerspectiveBar
            key={p.key}
            perspective={p}
            value={match.scores[p.key] ?? 0}
            delay={i * 0.06}
          />
        ))}
      </div>

      <Tabs defaultValue="evidence" className="mt-6">
        <TabsList aria-label="Source detail">
          <TabsTrigger value="evidence">Evidence ({match.evidence.length})</TabsTrigger>
          <TabsTrigger value="concepts">Concepts</TabsTrigger>
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="about">About this source</TabsTrigger>
        </TabsList>
        <TabsContent value="evidence">
          <EvidenceList evidence={match.evidence} terms={match.shared_terms ?? []} />
        </TabsContent>
        <TabsContent value="concepts">
          <Concepts terms={match.shared_terms ?? []} />
        </TabsContent>
        <TabsContent value="structure">
          <OutlineCompare headings={match.shared_headings ?? []} />
        </TabsContent>
        <TabsContent value="about">
          <AboutSource match={match} />
        </TabsContent>
      </Tabs>
    </Panel>
  );
}

// ----- Evidence ----------------------------------------------------------------

function EvidenceList({ evidence, terms }: { evidence: Evidence[]; terms: string[] }) {
  const sections = useMemo(
    () => [...new Set(evidence.map((e) => e.submitted.section).filter(Boolean))],
    [evidence],
  );
  const perspectives = useMemo(() => [...new Set(evidence.map((e) => e.perspective))], [evidence]);
  const [section, setSection] = useState("all");
  const [perspective, setPerspective] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const shown = evidence.filter(
    (e) =>
      (section === "all" || e.submitted.section === section) &&
      (perspective === "all" || e.perspective === perspective),
  );

  if (!evidence.length) {
    return (
      <EmptyState
        art={false}
        title="No passage pairs for this source"
        body="It matched on key terms or chapter structure rather than on specific passages."
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3 print:hidden">
        {sections.length > 1 && (
          <FilterSelect label="Section" value={section} onChange={setSection}>
            <option value="all">All sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </FilterSelect>
        )}
        {perspectives.length > 1 && (
          <FilterSelect label="Perspective" value={perspective} onChange={setPerspective}>
            <option value="all">All perspectives</option>
            {perspectives.map((p) => (
              <option key={p} value={p}>
                {PERSPECTIVE[p].name}
              </option>
            ))}
          </FilterSelect>
        )}
        <p className="text-muted-foreground self-center text-xs">
          {shown.length} of {evidence.length} pairs
        </p>
      </div>
      <ol className="space-y-4">
        {(showAll ? shown : shown.slice(0, 4)).map((e, i) => (
          <li key={i} data-print-avoid-break>
            <EvidencePair evidence={e} terms={terms} />
          </li>
        ))}
      </ol>
      {!showAll && shown.length > 4 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="border-border text-brand hover:bg-muted/50 mt-4 w-full cursor-pointer rounded-xl border border-dashed py-3 text-sm font-medium print:hidden"
        >
          Show all {shown.length} pairs
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-muted-foreground flex items-center gap-2 text-xs">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-input bg-card text-foreground h-8 max-w-48 rounded-lg border px-2 text-xs"
      >
        {children}
      </select>
    </label>
  );
}

/** "Your report" beside "Matched report", shared key terms marked in both. */
export function EvidencePair({ evidence, terms }: { evidence: Evidence; terms: string[] }) {
  const p = PERSPECTIVE[evidence.perspective];
  const crosses = isMostlyBangla(evidence.submitted.text) !== isMostlyBangla(evidence.source.text);
  return (
    <article className="border-border rounded-2xl border">
      <header className="border-border flex flex-wrap items-center gap-2 border-b px-4 py-2.5 text-xs">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium"
          style={{ background: p.soft, color: p.color }}
        >
          <p.icon className="size-3" aria-hidden />
          {p.name}
        </span>
        <span className="text-muted-foreground">{pct(evidence.score)} passage similarity</span>
        {crosses && <CrossLanguageBadge />}
      </header>
      <div className="grid md:grid-cols-2">
        <Passage label="Your report" excerpt={evidence.submitted} terms={terms} tint={p.soft} />
        <Passage
          label="Matched report"
          excerpt={evidence.source}
          terms={terms}
          tint={p.soft}
          className="border-border border-t md:border-t-0 md:border-l"
        />
      </div>
    </article>
  );
}

function Passage({
  label,
  excerpt,
  terms,
  tint,
  className,
}: {
  label: string;
  excerpt: { text: string; section: string };
  terms: string[];
  tint: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const long = excerpt.text.length > 260;
  return (
    <div className={cn("p-4", className)}>
      <p className="text-muted-foreground mb-1.5 text-[11px] font-semibold tracking-wide uppercase">
        {label}
        {excerpt.section && (
          <span className="normal-case">
            {" "}
            · <span {...langProps(excerpt.section)}>{excerpt.section}</span>
          </span>
        )}
      </p>
      <p
        {...langProps(excerpt.text)}
        className={cn(
          "bn-aware text-sm leading-relaxed",
          !open && long && "clamp-3 print:[display:block]",
        )}
      >
        <Highlighted text={excerpt.text} terms={terms} tint={tint} />
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-brand mt-1.5 cursor-pointer text-xs font-medium hover:underline print:hidden"
          aria-expanded={open}
        >
          {open ? "Show less" : "Show full passage"}
        </button>
      )}
    </div>
  );
}

const WORD = "[\\p{L}\\p{M}\\p{N}_]";

/** Marks whole-word occurrences of the shared key terms. */
function Highlighted({ text, terms, tint }: { text: string; terms: string[]; tint: string }) {
  const parts = useMemo(() => {
    const words = [...new Set(terms.filter((t) => t.length > 2))].sort(
      (a, b) => b.length - a.length,
    );
    if (!words.length) return [text];
    const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(`(?<!${WORD})(${escaped.join("|")})(?!${WORD})`, "giu");
    return text.split(pattern);
  }, [text, terms]);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="text-foreground rounded px-0.5" style={{ background: tint }}>
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

// ----- Concepts, structure, about ---------------------------------------------

function Concepts({ terms }: { terms: string[] }) {
  if (!terms.length) {
    return (
      <EmptyState
        art={false}
        title="No shared key terms"
        body="The two reports' distinctive vocabularies don't overlap."
      />
    );
  }
  return (
    <div>
      <p className="text-muted-foreground mb-3 text-sm">
        Distinctive key terms that both reports revolve around ({terms.length}).
      </p>
      <ul className="flex flex-wrap gap-2">
        {terms.map((term) => (
          <li
            key={term}
            {...langProps(term)}
            className="bg-concept-soft text-concept rounded-full px-3 py-1 text-sm font-medium"
          >
            {term}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-4 text-xs">
        The saved result keeps the shared terms only; terms found in just one of the reports
        aren&apos;t stored with it.
      </p>
    </div>
  );
}

/** The two outlines side by side, matching headings joined by a line. */
export function OutlineCompare({
  headings,
}: {
  headings: { submitted: string; source: string }[];
}) {
  if (!headings.length) {
    return (
      <EmptyState
        art={false}
        title="No shared headings"
        body="Apart from the DIU template, the two reports don't share chapter or section headings."
      />
    );
  }
  return (
    <div>
      <div className="text-muted-foreground mb-2 grid grid-cols-[1fr_40px_1fr] text-[11px] font-semibold tracking-wide uppercase">
        <span>Your report</span>
        <span />
        <span>Matched report</span>
      </div>
      <ol className="space-y-1.5">
        {headings.map((h, i) => (
          <li key={i} className="grid grid-cols-[1fr_40px_1fr] items-center text-sm">
            <span
              {...langProps(h.submitted)}
              className="bn-aware bg-muted/60 rounded-lg px-3 py-1.5"
            >
              {h.submitted}
            </span>
            <span aria-hidden className="bg-structural mx-1 h-px" />
            <span
              {...langProps(h.source)}
              className="bn-aware bg-structural-soft rounded-lg px-3 py-1.5"
            >
              {h.source}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground mt-4 text-xs">
        Headings both reports share, in order, after removing the DIU template. Headings found in
        only one report aren&apos;t stored with this result.
      </p>
    </div>
  );
}

function AboutSource({ match }: { match: Match }) {
  const rows: [string, ReactNode][] = [
    [
      "Title",
      <span key="t" {...langProps(match.source.title)}>
        {match.source.title}
      </span>,
    ],
    ["Year", match.source.year ?? "—"],
    ["Type", match.source.type ?? "—"],
    ["Department", "Not recorded in the corpus metadata"],
  ];
  return (
    <div>
      <dl className="divide-border divide-y text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-2.5 sm:grid-cols-[140px_1fr]">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="bn-aware">{value}</dd>
          </div>
        ))}
      </dl>
      {match.source.url && (
        <a
          href={match.source.url}
          target="_blank"
          rel="noreferrer"
          className="text-brand mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          Open on DIU DSpace
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
      <p className="text-muted-foreground mt-4 text-xs">
        Parallax doesn&apos;t show the names of the corpus reports&apos; authors.
      </p>
    </div>
  );
}
