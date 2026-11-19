"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileText,
  FileType2,
  Languages,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Timer,
  UploadCloud,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { PageHeader, Panel } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_UPLOAD_MB,
  MIN_WORDS,
  analyzePdf,
  analyzeText,
  PdfAnalysisError,
  type PdfPhase,
} from "@/lib/analysis/api";
import { AnalysisError, type AnalysisResult, type SimilarityLevel } from "@/lib/analysis/types";
import { LANGUAGE_LABELS, detectLanguage, fileSize, langProps, wordCount } from "@/lib/app/format";
import { CORPUS, PERSPECTIVES } from "@/lib/app/terms";
import { cn } from "@/lib/utils";
import type { JobView } from "./waiting-game/types";
import { gameOffered } from "./waiting-game/useGameStorage";
import { WaitingGame, WaitingGameInvite } from "./waiting-game/WaitingGame";

type Mode = "pdf" | "text";

/** The time now, read in event handlers (kept out of the component for render purity). */
const clock = () => Date.now();

type Step = { label: string; at: number };

/** Processing steps and when each usually starts (seconds into processing). */
const PDF_STEPS: Step[] = [
  { label: "Reading the PDF and finding its sections", at: 0 },
  { label: "Removing DIU template pages", at: 8 },
  { label: "Embedding passages with LaBSE", at: 15 },
  { label: `Searching ${CORPUS.passages.toLocaleString()} corpus passages`, at: 75 },
  { label: "Checking wording and building evidence", at: 100 },
  { label: "Comparing key concepts and chapter outlines", at: 125 },
];
const TEXT_TIMING = [0, 1, 4, 8, 12];
const TEXT_STEPS: Step[] = PDF_STEPS.slice(1).map((step, i) => ({
  ...step,
  at: TEXT_TIMING[i] ?? 0,
}));

type Run =
  | { state: "idle" }
  | {
      state: "running";
      mode: Mode;
      phase: PdfPhase | "text";
      upload: number;
      startedAt: number;
      processingAt: number | null;
      /** Place in the AI service's queue, while waiting. */
      position: number | null;
    }
  | {
      state: "failed";
      mode: Mode;
      message: string;
      step: string;
      startedAt: number;
      endedAt: number;
    }
  | {
      state: "saved";
      reportId: string;
      title: string;
      level: SimilarityLevel | null;
      startedAt: number;
      endedAt: number;
    };

/** The optional waiting game: not offered, inviting, open, or minimised to a pill. */
type GameState = "none" | "invite" | "open" | "min";

export function AnalyzePage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const mode: Mode = params.get("mode") === "text" ? "text" : "pdf";

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [run, setRun] = useState<Run>({ state: "idle" });
  const running = run.state === "running";
  const [game, setGame] = useState<GameState>("none");
  const playing = game === "open" || game === "min";
  // Read by async callbacks (the job outlives a render), so they see the latest values.
  const gameRef = useRef<GameState>("none");
  const runRef = useRef<Run>(run);
  useEffect(() => {
    gameRef.current = game;
    runRef.current = run;
  }, [game, run]);
  const now = useNow(playing && running);

  function setMode(next: Mode) {
    router.replace(`${pathname}?mode=${next}`, { scroll: false });
  }

  // The PDF result is saved by this tab's last call, so leaving early would lose it.
  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  async function start() {
    const startedAt = clock();
    if (mode === "pdf" && file) {
      setRun({
        state: "running",
        mode,
        phase: "ticket",
        upload: 0,
        startedAt,
        processingAt: null,
        position: null,
      });
      // Offer the game about a second in (PDF only: text finishes in 15–20 seconds).
      if (gameRef.current === "none" && gameOffered()) {
        window.setTimeout(() => {
          if (runRef.current.state === "running" && gameRef.current === "none") setGame("invite");
        }, 1000);
      }
      try {
        const result = await analyzePdf(file, {
          onQueue: (position) => setRun((r) => (r.state === "running" ? { ...r, position } : r)),
          onPhase: (phase) =>
            setRun((r) =>
              r.state === "running"
                ? {
                    ...r,
                    phase,
                    processingAt: phase === "processing" ? Date.now() : r.processingAt,
                  }
                : r,
            ),
          onUpload: (upload) => setRun((r) => (r.state === "running" ? { ...r, upload } : r)),
        });
        finish(result, file.name, startedAt);
      } catch (err) {
        fail(err, "pdf", startedAt);
      }
    } else if (mode === "text") {
      setRun({
        state: "running",
        mode,
        phase: "text",
        upload: 1,
        startedAt,
        processingAt: startedAt,
        position: null,
      });
      try {
        const name = title.trim() || "Untitled text";
        const result = await analyzeText(text.trim(), name);
        finish(result, name, startedAt);
      } catch (err) {
        fail(err, "text", startedAt);
      }
    }
  }

  function finish(result: AnalysisResult, name: string, startedAt: number) {
    const reportId = result.report_id;
    if (!reportId) {
      setRun({
        state: "failed",
        mode,
        message: "The analysis finished but the report could not be saved. Please try again.",
        step: "Saving the report",
        startedAt,
        endedAt: Date.now(),
      });
      return;
    }
    setRun({
      state: "saved",
      reportId,
      title: name,
      level: result.summary?.level ?? null,
      startedAt,
      endedAt: Date.now(),
    });
    // While the game is open (or minimised) the player decides when to leave.
    const current = gameRef.current;
    if (current === "open" || current === "min") return;
    if (current === "invite") setGame("none");
    setTimeout(() => router.push(`/dashboard/reports/${reportId}`), 900);
  }

  function viewReport() {
    if (run.state !== "saved") return;
    setGame("none");
    router.push(`/dashboard/reports/${run.reportId}`);
  }

  function closeGame() {
    setGame("none");
    // Closing after the report is saved continues the normal flow: open it.
    if (run.state === "saved") {
      const id = run.reportId;
      setTimeout(() => router.push(`/dashboard/reports/${id}`), 300);
    }
  }

  function fail(err: unknown, failedMode: Mode, startedAt: number) {
    const message =
      err instanceof AnalysisError ? err.message : "The analysis failed. Please try again.";
    let step: string;
    if (err instanceof PdfAnalysisError) {
      step =
        err.phase === "ticket"
          ? "Getting an upload pass"
          : err.phase === "uploading"
            ? "Uploading the PDF"
            : err.phase === "saving"
              ? "Saving the report"
              : activeStep(PDF_STEPS, (Date.now() - startedAt) / 1000).label;
    } else {
      step = activeStep(TEXT_STEPS, (Date.now() - startedAt) / 1000).label;
    }
    setRun({ state: "failed", mode: failedMode, message, step, startedAt, endedAt: Date.now() });
    if (gameRef.current === "invite") setGame("none");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analyze a document"
        description={`Compare a report or a passage with ${CORPUS.reports.toLocaleString()} earlier DIU reports and see the evidence.`}
      />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {run.state === "running" || run.state === "saved" ? (
            <ProgressPanel run={run} autoOpen={!playing} onViewReport={viewReport} />
          ) : (
            <Panel bodyClassName="p-5 sm:p-6">
              <ModeSwitch mode={mode} onChange={setMode} />
              {run.state === "failed" && run.mode === mode && (
                <FailureNotice message={run.message} step={run.step} onRetry={start} />
              )}
              <div className="mt-5">
                {mode === "pdf" ? (
                  <PdfInput
                    file={file}
                    error={fileError}
                    onFile={(next, error) => {
                      setFile(next);
                      setFileError(error);
                      if (run.state === "failed") setRun({ state: "idle" });
                    }}
                    onStart={start}
                  />
                ) : (
                  <TextInput
                    text={text}
                    title={title}
                    onText={setText}
                    onTitle={setTitle}
                    onStart={start}
                  />
                )}
              </div>
            </Panel>
          )}
        </div>
        <aside className="lg:col-span-5">
          <ChecksGuide />
        </aside>
      </div>

      {mode === "pdf" && (
        <WaitingGameInvite
          open={game === "invite"}
          onPlay={() => setGame("open")}
          onDecline={() => setGame("none")}
        />
      )}
      {playing && (
        <WaitingGame
          job={jobView(run, now)}
          minimised={game === "min"}
          onMinimise={() => setGame("min")}
          onRestore={() => setGame("open")}
          onClose={closeGame}
          onViewReport={viewReport}
          onRetry={start}
        />
      )}
    </div>
  );
}

/** The read-only snapshot of the analysis that the waiting game shows. */
function jobView(run: Run, now: number): JobView {
  const base = {
    reportId: null,
    title: "",
    level: null,
    error: null,
    position: null,
  } satisfies Partial<JobView>;
  if (run.state === "saved") {
    return {
      ...base,
      status: "ready",
      step: "Report saved",
      progress: 1,
      elapsed: Math.round((run.endedAt - run.startedAt) / 1000),
      reportId: run.reportId,
      title: run.title,
      level: run.level,
    };
  }
  if (run.state === "failed") {
    return {
      ...base,
      status: "failed",
      step: run.step,
      progress: 1,
      elapsed: Math.round((run.endedAt - run.startedAt) / 1000),
      error: { step: run.step, message: run.message },
    };
  }
  if (run.state !== "running") {
    return { ...base, status: "running", step: "Starting…", progress: 0, elapsed: 0 };
  }
  const elapsed = Math.max(0, Math.floor((now - run.startedAt) / 1000));
  let step: string;
  let progress: number;
  if (run.phase === "ticket") {
    step = "Preparing a secure upload";
    progress = 0.02;
  } else if (run.phase === "uploading") {
    step = `Uploading the PDF · ${Math.round(run.upload * 100)}%`;
    progress = 0.02 + run.upload * 0.08;
  } else if (run.phase === "saving") {
    step = "Checking the signature and saving the report";
    progress = 0.97;
  } else {
    const processingFor = run.processingAt ? Math.max(0, (now - run.processingAt) / 1000) : 0;
    const steps = run.mode === "pdf" ? PDF_STEPS : TEXT_STEPS;
    step = activeStep(steps, processingFor).label;
    // An estimate: about 150 s of processing, eased so it never sits at 100%.
    progress = 0.1 + 0.85 * (1 - Math.exp(-processingFor / 80));
  }
  return { ...base, status: "running", step, progress, elapsed, position: run.position };
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const options: { value: Mode; label: string; icon: typeof FileType2 }[] = [
    { value: "pdf", label: "PDF report", icon: FileType2 },
    { value: "text", label: "Paste text", icon: FileText },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="What to analyze"
      className="bg-muted inline-flex rounded-full p-1"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          onClick={() => onChange(value)}
          className={cn(
            "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
            mode === value
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

// ----- PDF ----------------------------------------------------------------------

async function checkPdf(file: File): Promise<string | null> {
  if (file.size === 0) return "This file is empty. Choose the PDF of your report.";
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `This file is ${fileSize(file.size)}; the limit is ${MAX_UPLOAD_MB} MB. Try a smaller export, or paste the text instead.`;
  }
  const head = await file
    .slice(0, 5)
    .text()
    .catch(() => "");
  if (!head.startsWith("%PDF") && !/\.pdf$/i.test(file.name)) {
    return "This isn't a PDF. Export your report as a PDF and choose that file.";
  }
  if (!head.startsWith("%PDF"))
    return "This file doesn't look like a real PDF. Export it again as a PDF.";
  return null;
}

function PdfInput({
  file,
  error,
  onFile,
  onStart,
}: {
  file: File | null;
  error: string | null;
  onFile: (file: File | null, error: string | null) => void;
  onStart: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const errorId = useId();

  async function accept(next: File | undefined) {
    if (!next) return;
    const problem = await checkPdf(next);
    onFile(problem ? null : next, problem);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void accept(event.dataTransfer.files[0]);
  }

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf,.pdf"
      className="sr-only"
      aria-describedby={error ? errorId : undefined}
      onChange={(e) => {
        void accept(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (file) {
    return (
      <div>
        {picker}
        <div className="border-border bg-muted/40 flex items-center gap-4 rounded-2xl border p-4">
          <span className="bg-semantic-soft text-brand grid size-12 shrink-0 place-items-center rounded-xl">
            <FileType2 className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p {...langProps(file.name)} className="truncate font-medium">
              {file.name}
            </p>
            <p className="text-muted-foreground text-sm">{fileSize(file.size)} · PDF</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFile(null, null)}
              aria-label="Remove file"
            >
              <X aria-hidden />
              <span className="max-sm:sr-only">Remove</span>
            </Button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Timer className="size-4" aria-hidden />
            About 2–3 minutes
          </p>
          <Button size="lg" onClick={onStart}>
            Start analysis
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {picker}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center rounded-2xl border-2 px-6 py-12 text-center transition-colors",
          dragging
            ? "border-transparent [background:linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(110deg,var(--lexical),var(--semantic),var(--concept),var(--structural))_border-box]"
            : error
              ? "border-danger/50 bg-danger/5 border-dashed"
              : "border-input hover:border-primary/50 hover:bg-muted/40 border-dashed",
        )}
      >
        <span className="bg-semantic-soft text-brand grid size-14 place-items-center rounded-2xl">
          <UploadCloud className="size-7" aria-hidden />
        </span>
        <span className="mt-4 text-base font-medium">
          {dragging ? "Drop the PDF to add it" : "Drag your report here, or choose a file"}
        </span>
        <span className="text-muted-foreground mt-1.5 max-w-md text-sm">
          PDF up to {MAX_UPLOAD_MB} MB · text-based PDFs (scanned pages can&apos;t be read yet) ·
          about 2–3 minutes
        </span>
      </button>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-danger mt-3 flex items-start gap-2 text-sm font-medium"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

// ----- Text -----------------------------------------------------------------------

function TextInput({
  text,
  title,
  onText,
  onTitle,
  onStart,
}: {
  text: string;
  title: string;
  onText: (text: string) => void;
  onTitle: (title: string) => void;
  onStart: () => void;
}) {
  const words = wordCount(text);
  const language = detectLanguage(text);
  const enough = words >= MIN_WORDS;
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="analysis-title" className="mb-1.5 block text-sm font-medium">
          Title <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          id="analysis-title"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Untitled text"
          maxLength={300}
          {...langProps(title)}
        />
      </div>
      <div>
        <label htmlFor="analysis-text" className="mb-1.5 block text-sm font-medium">
          Text
        </label>
        <textarea
          id="analysis-text"
          value={text}
          onChange={(e) => onText(e.target.value)}
          rows={12}
          aria-describedby="analysis-text-help"
          placeholder="Paste a section of a report in Bangla, English or both…"
          className="border-input bg-card placeholder:text-muted-foreground/80 focus-visible:border-ring [field-sizing:content] min-h-72 w-full resize-y rounded-xl border px-3.5 py-3 text-sm leading-[1.75] outline-none focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_22%,transparent)]"
          style={{ fontFamily: "var(--font-sans)" }}
        />
        <div id="analysis-text-help" className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn("tabular-nums", enough ? "text-muted-foreground" : "text-foreground")}
          >
            {words.toLocaleString()} {words === 1 ? "word" : "words"}
          </span>
          {language && (
            <span className="border-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
              <Languages className="size-3" aria-hidden />
              {LANGUAGE_LABELS[language]}
            </span>
          )}
          <span className="text-muted-foreground">· Minimum {MIN_WORDS} words</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Timer className="size-4" aria-hidden />
          {enough ? "About 15–20 seconds" : `Add ${MIN_WORDS - words} more words to start`}
        </p>
        <Button size="lg" onClick={onStart} disabled={!enough}>
          Start analysis
        </Button>
      </div>
    </div>
  );
}

// ----- Guide ------------------------------------------------------------------------

function ChecksGuide() {
  return (
    <Panel title="What Parallax checks" className="lg:sticky lg:top-24">
      <ul className="space-y-3">
        {PERSPECTIVES.map((p) => (
          <li key={p.key} className="flex gap-3">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-lg"
              style={{ background: p.soft, color: p.color }}
            >
              <p.icon className="size-4" aria-hidden />
            </span>
            <span className="text-sm">
              <span className="font-medium">{p.name}</span>
              <span className="text-muted-foreground block">{p.question}</span>
            </span>
          </li>
        ))}
      </ul>
      <ul className="border-border text-muted-foreground mt-5 space-y-2.5 border-t pt-5 text-sm">
        <li className="flex gap-2.5">
          <ShieldCheck className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
          DIU cover pages and template text are ignored.
        </li>
        <li className="flex gap-2.5">
          <Languages className="text-brand mt-0.5 size-4 shrink-0" aria-hidden />
          Bangla and English are compared in one shared space, so a translation still matches.
        </li>
        <li className="flex gap-2.5">
          <Timer className="mt-0.5 size-4 shrink-0" aria-hidden />A full PDF takes about 2–3
          minutes; pasted text about 15–20 seconds.
        </li>
      </ul>
    </Panel>
  );
}

// ----- Progress ---------------------------------------------------------------------

function activeStep(steps: Step[], seconds: number): Step {
  return [...steps].reverse().find((s) => seconds >= s.at) ?? steps[0]!;
}

/** The current time, ticking every second while `active`. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function FailureNotice({
  message,
  step,
  onRetry,
}: {
  message: string;
  step: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="border-danger/40 bg-danger/5 mt-5 rounded-2xl border p-4">
      <p className="text-danger flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="size-4" aria-hidden />
        Stopped at: {step}
      </p>
      <p className="mt-1 text-sm">{message}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        <RefreshCw aria-hidden />
        Try again
      </Button>
    </div>
  );
}

function ProgressPanel({
  run,
  autoOpen,
  onViewReport,
}: {
  run: Extract<Run, { state: "running" } | { state: "saved" }>;
  autoOpen: boolean;
  onViewReport: () => void;
}) {
  const reduced = useReducedMotion();
  const runningState = run.state === "running" ? run : null;
  const now = useNow(run.state === "running");
  const elapsed = runningState ? Math.max(0, Math.floor((now - runningState.startedAt) / 1000)) : 0;
  const processingFor = runningState?.processingAt
    ? Math.max(0, (now - runningState.processingAt) / 1000)
    : -1;
  const mode = runningState?.mode ?? "pdf";
  const steps = mode === "pdf" ? PDF_STEPS : TEXT_STEPS;
  const saving = runningState?.phase === "saving";
  const current = processingFor < 0 ? -1 : steps.indexOf(activeStep(steps, processingFor));

  if (run.state === "saved") {
    return (
      <Panel bodyClassName="py-14">
        <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
          <motion.span
            initial={reduced ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="bg-success/10 text-success grid size-16 place-items-center rounded-full"
          >
            <CheckCircle2 className="size-8" aria-hidden />
          </motion.span>
          <p className="mt-4 text-lg font-semibold">Report saved</p>
          {autoOpen ? (
            <p className="text-muted-foreground mt-1 text-sm">Opening your report…</p>
          ) : (
            <Button className="mt-4" onClick={onViewReport}>
              View report
            </Button>
          )}
        </div>
      </Panel>
    );
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, "0");
  return (
    <Panel>
      <div aria-live="polite" role="status">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold">
              <Loader2 className="text-brand size-5 animate-spin" aria-hidden />
              Analyzing…
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {mode === "pdf" ? "Usually 2–3 minutes." : "Usually 15–20 seconds."} You can keep
              working in another tab, but keep this one open until the report is saved.
            </p>
          </div>
          <span className="bg-muted rounded-full px-3 py-1 font-mono text-sm tabular-nums">
            {minutes}:{seconds}
          </span>
        </div>

        {mode === "pdf" &&
          runningState &&
          (runningState.phase === "ticket" || runningState.phase === "uploading") && (
            <div className="mt-6">
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium">
                  {runningState.phase === "ticket"
                    ? "Preparing a secure upload…"
                    : "Uploading the PDF"}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {Math.round(runningState.upload * 100)}%
                </span>
              </div>
              <div
                className="bg-muted h-2 overflow-hidden rounded-full"
                role="progressbar"
                aria-label="Upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(runningState.upload * 100)}
              >
                <div
                  className="bg-primary h-full rounded-full transition-[width] duration-200"
                  style={{ width: `${Math.round(runningState.upload * 100)}%` }}
                />
              </div>
            </div>
          )}

        <ol className="mt-6 space-y-1">
          {steps.map((step, i) => {
            const done = saving || i < current;
            const active = !saving && i === current;
            return (
              <li key={step.label} className="flex items-center gap-3 py-1.5 text-sm">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border",
                    done && "border-success bg-success text-white",
                    active && "border-primary text-brand",
                    !done && !active && "border-border text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : active ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <span className="text-[10px]">{i + 1}</span>
                  )}
                </span>
                <span
                  className={cn(
                    done || active ? "text-foreground" : "text-muted-foreground",
                    active && "font-medium",
                  )}
                >
                  {step.label}
                </span>
                <span className="sr-only">
                  {done ? "(done)" : active ? "(in progress)" : "(waiting)"}
                </span>
              </li>
            );
          })}
          {mode === "pdf" && (
            <li className="flex items-center gap-3 py-1.5 text-sm">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border",
                  saving ? "border-primary text-brand" : "border-border text-muted-foreground",
                )}
              >
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <span className="text-[10px]">{steps.length + 1}</span>
                )}
              </span>
              <span className={saving ? "font-medium" : "text-muted-foreground"}>
                Checking the result&apos;s signature and saving the report
              </span>
            </li>
          )}
        </ol>
        <p className="text-muted-foreground mt-4 text-xs">
          Step timing is an estimate; the steps run on the analysis service.
        </p>
      </div>
    </Panel>
  );
}
