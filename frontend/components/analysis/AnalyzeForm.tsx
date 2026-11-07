"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, FileText, FileUp, Sparkles, Type, X } from "lucide-react";
import { useState, type DragEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MAX_UPLOAD_MB, MIN_WORDS, analyzePdf, analyzeText } from "@/lib/analysis/api";
import { AnalysisError, type SavedAnalysis } from "@/lib/analysis/types";
import { cn } from "@/lib/utils";
import { AnalysisProgress } from "./AnalysisProgress";

type Mode = "pdf" | "text";

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Upload a PDF or paste text, run the analysis, and hand the result back. */
export function AnalyzeForm({ onResult }: { onResult: (saved: SavedAnalysis) => void }) {
  const [mode, setMode] = useState<Mode>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = countWords(text);

  function pickFile(next: File | undefined) {
    setError(null);
    if (!next) return;
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a PDF file.");
      return;
    }
    if (next.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`That file is ${formatSize(next.size)}. The limit is ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    setFile(next);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    pickFile(event.dataTransfer.files[0]);
  }

  const canSubmit = mode === "pdf" ? Boolean(file) : words >= MIN_WORDS;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || running) return;
    setError(null);
    setRunning(true);
    try {
      const result =
        mode === "pdf" && file ? await analyzePdf(file) : await analyzeText(text, title.trim());
      onResult({
        result,
        analyzedAt: new Date().toISOString(),
        sourceName: mode === "pdf" && file ? file.name : title.trim() || "Pasted text",
      });
    } catch (err) {
      setError(
        err instanceof AnalysisError ? err.message : "The analysis failed. Please try again.",
      );
    } finally {
      setRunning(false);
    }
  }

  if (running) return <AnalysisProgress mode={mode} />;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList aria-label="What to analyze">
          <TabsTrigger value="pdf">
            <FileUp aria-hidden />
            Upload PDF
          </TabsTrigger>
          <TabsTrigger value="text">
            <Type aria-hidden />
            Paste text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pdf" className="mt-5">
          <AnimatePresence mode="wait" initial={false}>
            {file ? (
              <motion.div
                key="file"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="border-border bg-card flex items-center gap-4 rounded-2xl border p-4"
              >
                <span className="bg-semantic-soft text-brand grid size-12 shrink-0 place-items-center rounded-xl">
                  <FileText className="size-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-muted-foreground text-sm">{formatSize(file.size)} · PDF</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X aria-hidden />
                </Button>
              </motion.div>
            ) : (
              <motion.label
                key="drop"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                htmlFor="report-file"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "border-input hover:border-primary/60 hover:bg-muted/40 focus-within:ring-ring flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors focus-within:ring-2",
                  dragging && "border-primary bg-semantic-soft",
                )}
              >
                <motion.span
                  animate={dragging ? { y: -4, scale: 1.06 } : { y: 0, scale: 1 }}
                  className="bg-semantic-soft text-brand grid size-14 place-items-center rounded-2xl"
                >
                  <FileUp className="size-7" aria-hidden />
                </motion.span>
                <span className="font-medium">
                  {dragging ? "Drop the PDF here" : "Drag a report here, or click to choose"}
                </span>
                <span className="text-muted-foreground text-sm">
                  PDF up to {MAX_UPLOAD_MB} MB · Bangla, English or mixed
                </span>
                <input
                  id="report-file"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    pickFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </motion.label>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="text" className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="analysis-title">
              Title <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="analysis-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g. Chapter 2 — Literature review"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="analysis-text">Text</Label>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  words >= MIN_WORDS ? "text-muted-foreground" : "text-lexical",
                )}
                aria-live="polite"
              >
                {words.toLocaleString()} words{words < MIN_WORDS && ` · at least ${MIN_WORDS}`}
              </span>
            </div>
            <textarea
              id="analysis-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Paste a section of a report in Bangla, English or both…"
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-y rounded-xl border px-3.5 py-3 text-sm leading-relaxed outline-none focus-visible:ring-2"
            />
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <div
          role="alert"
          className="border-danger/30 bg-danger/5 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm"
        >
          <AlertCircle className="text-danger mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!canSubmit}>
        <Sparkles aria-hidden />
        Find potential similarity
      </Button>
    </form>
  );
}
