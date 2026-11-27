"use client";

import { AlertCircle, ExternalLink, Lightbulb, Loader2, Search, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { EmptyState, PageHeader, Panel, Skeleton } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { AnalysisError } from "@/lib/analysis/types";
import { langProps } from "@/lib/app/format";
import {
  type Closeness,
  findRelatedWork,
  TooManySearchesError,
  MAX_IDEA_CHARS,
  MIN_IDEA_WORDS,
  type RelatedReport,
  type RelatedResult,
} from "@/lib/related/api";
import { cn } from "@/lib/utils";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; result: RelatedResult };

const CLOSENESS: Record<Closeness, { label: string; className: string }> = {
  close: { label: "Close to your idea", className: "bg-semantic-soft text-semantic" },
  related: { label: "Related", className: "bg-concept-soft text-concept" },
  distant: { label: "Loosely related", className: "bg-muted text-muted-foreground" },
};

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** /dashboard/related: earlier DIU reports close to a project idea, before writing. */
export function RelatedWorkPage() {
  const [idea, setIdea] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [state, setState] = useState<State>({ status: "idle" });
  const ideaId = useId();
  const resultsRef = useRef<HTMLDivElement>(null);
  const words = countWords(idea);
  // Seconds left before the server accepts another search, after a 429.
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (words < MIN_IDEA_WORDS) {
      setInputError(`Describe your idea in at least ${MIN_IDEA_WORDS} words.`);
      return;
    }
    setInputError(null);
    setState({ status: "loading" });
    try {
      const result = await findRelatedWork(idea.trim());
      setState({ status: "ready", result });
      requestAnimationFrame(() => resultsRef.current?.focus());
    } catch (err) {
      if (err instanceof TooManySearchesError) setCooldown(err.retryAfter);
      setState({
        status: "error",
        message:
          err instanceof AnalysisError ? err.message : "The search failed. Please try again.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explore prior work"
        description="Describe a project idea and see the closest earlier DIU reports before you start writing. Searches are not saved, and reviewers don't see them."
      />

      <Panel>
        <form onSubmit={onSubmit} noValidate className="space-y-3">
          <label htmlFor={ideaId} className="block font-medium">
            Your project idea
          </label>
          <textarea
            id={ideaId}
            value={idea}
            onChange={(e) => {
              setIdea(e.target.value);
              if (inputError) setInputError(null);
            }}
            maxLength={MAX_IDEA_CHARS}
            rows={5}
            aria-invalid={inputError ? true : undefined}
            aria-describedby={`${ideaId}-help${inputError ? ` ${ideaId}-error` : ""}`}
            placeholder="For example: A mobile app that helps farmers spot rice leaf diseases from a photo and suggests a treatment, and works offline in villages."
            className="border-input bg-card placeholder:text-muted-foreground/80 focus-visible:border-ring aria-invalid:border-danger w-full resize-y rounded-xl border px-3.5 py-3 text-sm leading-relaxed outline-none focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_22%,transparent)]"
          />
          <p id={`${ideaId}-help`} className="text-muted-foreground text-xs">
            Two to four sentences: what it does, for whom, and how. Bangla or English. ·{" "}
            <span className="tabular-nums">
              {words} {words === 1 ? "word" : "words"}
            </span>
          </p>
          {inputError && (
            <p id={`${ideaId}-error`} role="alert" className="text-danger text-sm">
              {inputError}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={state.status === "loading" || cooldown > 0}>
              {state.status === "loading" ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Search aria-hidden />
              )}
              {state.status === "loading"
                ? "Searching…"
                : cooldown > 0
                  ? `Try again in ${cooldown}s`
                  : "Find related work"}
            </Button>
          </div>
        </form>
      </Panel>

      <div ref={resultsRef} tabIndex={-1} className="outline-none" aria-live="polite">
        {state.status === "idle" && (
          <EmptyState
            title="Start with an idea"
            body="Parallax compares it with earlier DIU project, thesis and internship reports, and shows what they share with your idea and what your idea adds."
          />
        )}
        {state.status === "loading" && (
          <div className="space-y-3" aria-busy="true" aria-label="Searching earlier reports">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
        )}
        {state.status === "error" && (
          <div
            role="alert"
            className="border-danger/30 bg-danger/5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm"
          >
            <AlertCircle className="text-danger mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {state.message} Your idea is still in the box above, so you can search again.
            </span>
          </div>
        )}
        {state.status === "ready" && <Results result={state.result} />}
      </div>
    </div>
  );
}

function Results({ result }: { result: RelatedResult }) {
  const { reports, idea_terms: ideaTerms, corpus } = result;
  if (reports.length === 0) {
    return (
      <EmptyState
        title="No earlier reports found"
        body="Try describing the idea with a few more details."
      />
    );
  }
  const close = reports.filter((r) => r.closeness === "close").length;
  const anyRelated = reports.some((r) => r.closeness !== "distant");
  const searched = corpus.documents.toLocaleString();

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-start gap-3">
          <span className="bg-semantic-soft text-semantic grid size-9 shrink-0 place-items-center rounded-xl">
            {anyRelated ? (
              <Lightbulb className="size-4" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0 space-y-2">
            <p className="font-medium">
              {close > 0
                ? `${close} of ${searched} earlier reports ${close === 1 ? "is" : "are"} close to your idea. Read ${close === 1 ? "it" : "them"} to see what has been done and what you could do differently.`
                : anyRelated
                  ? `Nothing in ${searched} earlier reports is close, but some are related. Your idea looks fairly new here.`
                  : `Nothing in ${searched} earlier reports is close to your idea. It looks new here.`}
            </p>
            {ideaTerms.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="text-muted-foreground">Only in your idea:</span>
                {ideaTerms.map((term) => (
                  <span
                    key={term}
                    {...langProps(term)}
                    className="bg-concept-soft text-concept rounded-full px-2.5 py-0.5 text-xs font-medium"
                  >
                    {term}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <ol className="space-y-3" aria-label="Earlier reports, closest first">
        {reports.map((report, i) => (
          <li key={report.source.id}>
            <ReportCard report={report} rank={i + 1} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReportCard({ report, rank }: { report: RelatedReport; rank: number }) {
  const { source } = report;
  const band = CLOSENESS[report.closeness];
  const details = [source.year, source.type].filter(Boolean).join(" · ");

  return (
    <article className="border-border bg-card rounded-2xl border p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs tabular-nums">#{rank}</p>
          <h2 {...langProps(source.title)} className="bn-aware mt-0.5 font-semibold text-balance">
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-brand inline-flex items-start gap-1.5 hover:underline"
              >
                {source.title}
                <ExternalLink className="mt-1 size-3.5 shrink-0" aria-hidden />
                <span className="sr-only">(opens the report in the DIU repository)</span>
              </a>
            ) : (
              source.title
            )}
          </h2>
          {details && <p className="text-muted-foreground mt-0.5 text-sm">{details}</p>}
        </div>
        <span
          className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", band.className)}
        >
          {band.label}
        </span>
      </div>

      <blockquote
        {...langProps(report.excerpt)}
        className="border-border text-muted-foreground mt-4 border-l-2 pl-3 text-sm leading-relaxed"
      >
        {report.section && (
          <span className="text-foreground mb-1 block text-xs font-medium">{report.section}</span>
        )}
        {report.excerpt}
      </blockquote>

      {report.shared_terms.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Shared with your idea:</span>
          {report.shared_terms.map((term) => (
            <span
              key={term}
              {...langProps(term)}
              className="bg-semantic-soft text-semantic rounded-full px-2.5 py-0.5 text-xs font-medium"
            >
              {term}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
