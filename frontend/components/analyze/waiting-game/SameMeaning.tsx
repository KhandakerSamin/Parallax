"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, FileText, RotateCcw, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MEANING_PAIRS, type MeaningPair } from "./meaning-pairs";
import { shuffle } from "./shuffle";
import { sounds } from "./sounds";
import { GAME_KEYS, readStored, useStored, writeStored } from "./useGameStorage";

const ROUNDS = 10;
const ROUND_SECONDS = 8;
const FEEDBACK_MS = 1200;

type Feedback = { correct: boolean; line: string; timedOut?: boolean };

function newRounds(): MeaningPair[] {
  return shuffle(MEANING_PAIRS).slice(0, ROUNDS);
}

export function SameMeaning({
  soundOn,
  reportReady,
  onViewReport,
  onBack,
  announce,
}: {
  soundOn: boolean;
  reportReady: boolean;
  onViewReport: () => void;
  onBack: () => void;
  announce: (message: string) => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const [timedStored, setTimedStored] = useStored(GAME_KEYS.timed, "off");
  const timed = timedStored === "on";
  const [rounds, setRounds] = useState<MeaningPair[]>(newRounds);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [remaining, setRemaining] = useState(ROUND_SECONDS);
  const [done, setDone] = useState<{ score: number; best: number; isNewBest: boolean } | null>(
    null,
  );
  const pending = useRef<number | null>(null);
  const round = rounds[index]!;

  useEffect(
    () => () => {
      if (pending.current) window.clearTimeout(pending.current);
    },
    [],
  );

  const answer = useCallback(
    (choice: boolean | null) => {
      if (feedback || done) return;
      const correct = choice === round.same;
      const nextScore = score + (correct ? 1 : 0);
      let line: string;
      if (choice === null) {
        line = `Time's up. ${round.same ? "These say the same thing." : (round.why ?? "The meaning differs.")}`;
      } else if (correct) {
        line = round.same
          ? "Right, same idea in another language."
          : `Right, the meaning changed. ${round.why ?? ""}`.trim();
      } else {
        line = round.same
          ? "Close, but these say the same thing in two languages."
          : (round.why ?? "Close, but the meaning differs.");
      }
      setScore(nextScore);
      setFeedback({ correct, line, timedOut: choice === null });
      if (soundOn) (correct ? sounds.match : sounds.miss)();
      announce(`${correct ? "Correct." : "Not quite."} ${line}`);
      pending.current = window.setTimeout(() => {
        pending.current = null;
        setFeedback(null);
        setRemaining(ROUND_SECONDS);
        if (index + 1 < rounds.length) {
          setIndex(index + 1);
        } else {
          const previous = Number(readStored(GAME_KEYS.bestMeaning) ?? "0") || 0;
          const isNewBest = nextScore > previous;
          if (isNewBest) writeStored(GAME_KEYS.bestMeaning, String(nextScore));
          setDone({ score: nextScore, best: Math.max(previous, nextScore), isNewBest });
          if (soundOn && nextScore >= 7) sounds.win();
          announce(`Finished: ${nextScore} out of ${ROUNDS}.${isNewBest ? " New best!" : ""}`);
        }
      }, FEEDBACK_MS);
    },
    [announce, done, feedback, index, round, rounds.length, score, soundOn],
  );

  // S / D keys.
  useEffect(() => {
    if (done) return;
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = e.key.toLowerCase();
      if (key === "s") answer(true);
      else if (key === "d") answer(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, done]);

  // Optional timed mode: a gentle 8-second bar, paused while the tab is hidden.
  useEffect(() => {
    if (!timed || feedback || done) return;
    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible") setRemaining((r) => Math.max(0, r - 0.25));
    }, 250);
    return () => window.clearInterval(tick);
  }, [timed, feedback, done, index]);

  useEffect(() => {
    if (timed && remaining <= 0 && !feedback && !done) {
      const t = window.setTimeout(() => answer(null), 0);
      return () => window.clearTimeout(t);
    }
  }, [timed, remaining, feedback, done, answer]);

  function restart() {
    if (pending.current) window.clearTimeout(pending.current);
    setRounds(newRounds());
    setIndex(0);
    setScore(0);
    setFeedback(null);
    setRemaining(ROUND_SECONDS);
    setDone(null);
    announce("New round of Same Meaning. Ten pairs.");
  }

  if (done) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <motion.div
          initial={reduced ? false : { scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="border-border bg-card shadow-lift w-full max-w-md rounded-2xl border p-6"
        >
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Same Meaning? · finished
          </p>
          <p className="mt-3 text-4xl font-semibold tabular-nums">
            {done.score}
            <span className="text-muted-foreground text-xl font-normal">/{ROUNDS}</span>
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Best: {done.best}/{ROUNDS}
            {done.isNewBest && <span className="text-semantic ml-2 font-semibold">New best!</span>}
          </p>
          <p className="mt-4 text-sm">
            That&apos;s the semantic perspective: Parallax compares meaning, not spelling.
          </p>
          <div className="mt-5 grid gap-2">
            {reportReady && (
              <Button onClick={onViewReport} autoFocus>
                <FileText aria-hidden />
                View report
              </Button>
            )}
            <Button
              variant={reportReady ? "outline" : "primary"}
              onClick={restart}
              autoFocus={!reportReady}
            >
              <RotateCcw aria-hidden />
              Play again
            </Button>
            <Button variant="outline" size="sm" onClick={onBack}>
              Back to games
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 px-2.5">
          <ArrowLeft aria-hidden />
          Games
        </Button>
        <div className="text-muted-foreground flex items-center gap-4 text-xs tabular-nums">
          <span>
            Round <span className="text-foreground font-semibold">{index + 1}</span>/{ROUNDS}
          </span>
          <span>
            Score <span className="text-foreground font-semibold">{score}</span>
          </span>
          <label className="flex cursor-pointer items-center gap-2">
            <span>Timed mode</span>
            <button
              type="button"
              role="switch"
              aria-checked={timed}
              onClick={() => {
                setTimedStored(timed ? "off" : "on");
                setRemaining(ROUND_SECONDS);
              }}
              className={cn(
                "focus-visible:ring-ring relative h-5 w-9 cursor-pointer rounded-full transition-colors outline-none focus-visible:ring-2",
                timed ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform",
                  timed && "translate-x-4",
                )}
              />
            </button>
          </label>
        </div>
      </div>

      <div className="bg-muted mb-4 h-1 overflow-hidden rounded-full" aria-hidden>
        <div
          className="bg-semantic h-full rounded-full transition-[width] duration-300"
          style={{
            width: timed
              ? `${(remaining / ROUND_SECONDS) * 100}%`
              : `${((index + (feedback ? 1 : 0)) / ROUNDS) * 100}%`,
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 overflow-y-auto">
        <p className="text-muted-foreground text-center text-sm">
          Do these two sentences mean the same thing?
        </p>
        <motion.div
          key={index}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-3"
        >
          <SentenceCard tag="EN" text={round.en} lang="en" />
          <SentenceCard tag="বাংলা" text={round.bn} lang="bn" />
        </motion.div>

        <div className="min-h-14" aria-hidden={!feedback}>
          {feedback && (
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex items-start justify-center gap-2 rounded-xl px-3 py-2 text-center text-sm",
                feedback.correct
                  ? "bg-success/10 text-success"
                  : "bg-level-moderate-soft text-level-moderate",
              )}
            >
              {feedback.correct ? (
                <Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} aria-hidden />
              ) : (
                <Undo2 className="mt-0.5 size-4 shrink-0" aria-hidden />
              )}
              <span className="bn-aware">{feedback.line}</span>
            </motion.p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3">
        <Button
          size="lg"
          variant="outline"
          onClick={() => answer(true)}
          disabled={!!feedback}
          className="border-semantic/40 hover:bg-semantic-soft"
        >
          Same meaning
          <kbd className="text-muted-foreground border-border ml-1 hidden rounded border px-1.5 text-[10px] sm:inline">
            S
          </kbd>
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => answer(false)}
          disabled={!!feedback}
          className="hover:bg-muted"
        >
          Different meaning
          <kbd className="text-muted-foreground border-border ml-1 hidden rounded border px-1.5 text-[10px] sm:inline">
            D
          </kbd>
        </Button>
      </div>
    </div>
  );
}

function SentenceCard({ tag, text, lang }: { tag: string; text: string; lang: "en" | "bn" }) {
  return (
    <div className="border-border bg-card rounded-2xl border p-4 sm:p-5">
      <span
        lang={lang === "bn" ? "bn" : undefined}
        className={cn(
          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
          lang === "en" ? "bg-muted text-muted-foreground" : "bg-concept-soft text-concept",
        )}
      >
        {tag}
      </span>
      <p
        lang={lang}
        className={cn(
          "mt-2 font-medium",
          lang === "bn" ? "text-lg leading-[1.8] sm:text-xl" : "text-base sm:text-lg",
        )}
      >
        {text}
      </p>
    </div>
  );
}
