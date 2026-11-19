"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Eye, FileText, RotateCcw, Sparkles, Star } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { LogoMark } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FACTS, WORD_PAIRS } from "./pairs";
import { shuffle } from "./shuffle";
import { sounds } from "./sounds";
import { GAME_KEYS, readJson, useStored, writeStored } from "./useGameStorage";

export type Difficulty = "easy" | "normal" | "hard";

export const DIFFICULTIES: Record<
  Difficulty,
  {
    label: string;
    pairs: number;
    cols: number;
    rows: number;
    narrowCols: number;
    narrowRows: number;
  }
> = {
  easy: { label: "Easy", pairs: 6, cols: 4, rows: 3, narrowCols: 3, narrowRows: 4 },
  normal: { label: "Normal", pairs: 8, cols: 4, rows: 4, narrowCols: 4, narrowRows: 4 },
  hard: { label: "Hard", pairs: 10, cols: 5, rows: 4, narrowCols: 4, narrowRows: 5 },
};

const COLOURS = ["var(--semantic)", "var(--lexical)", "var(--concept)", "var(--structural)"];
const CONFETTI = [...COLOURS, "var(--semantic)", "var(--concept)"];

export type PairsBest = { stars: number; moves: number; seconds: number };

type Card = { key: string; pair: number; lang: "en" | "bn"; text: string };
type Piece = { x: number; y: number; r: number; colour: string; delay: number };

function newDeck(difficulty: Difficulty): Card[] {
  const chosen = shuffle(WORD_PAIRS).slice(0, DIFFICULTIES[difficulty].pairs);
  return shuffle(
    chosen.flatMap((p, i) => [
      { key: `${i}-en`, pair: i, lang: "en" as const, text: p.en },
      { key: `${i}-bn`, pair: i, lang: "bn" as const, text: p.bn },
    ]),
  );
}

function starsFor(moves: number, pairs: number, peeked: boolean): number {
  const base = moves <= pairs + 2 ? 3 : moves <= pairs * 2 ? 2 : 1;
  return Math.max(1, base - (peeked ? 1 : 0));
}

function isBetter(a: PairsBest, b: PairsBest | null): boolean {
  if (!b) return true;
  if (a.stars !== b.stars) return a.stars > b.stars;
  if (a.moves !== b.moves) return a.moves < b.moves;
  return a.seconds < b.seconds;
}

export function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function randomUnit(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 0x1_0000_0000;
}

const narrowQuery = "(max-width: 639px)";
function useNarrow(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(narrowQuery);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(narrowQuery).matches,
    () => false,
  );
}

function isDifficulty(value: string): value is Difficulty {
  return value === "easy" || value === "normal" || value === "hard";
}

export function ParallaxPairs({
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
  const narrow = useNarrow();
  const [storedDifficulty, setStoredDifficulty] = useStored(GAME_KEYS.difficulty, "normal");
  const difficulty: Difficulty = isDifficulty(storedDifficulty) ? storedDifficulty : "normal";
  const config = DIFFICULTIES[difficulty];

  const [deck, setDeck] = useState<Card[]>(() => newDeck(difficulty));
  const [faceUp, setFaceUp] = useState<number[]>([]);
  const [matched, setMatched] = useState<Record<number, number>>({});
  const [moves, setMoves] = useState(0);
  const [streak, setStreak] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [peekUsed, setPeekUsed] = useState(false);
  const [result, setResult] = useState<{ best: PairsBest; isNewBest: boolean } | null>(null);
  const [confetti, setConfetti] = useState<Piece[]>([]);

  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timers = useRef<number[]>([]);

  const matchedCount = Object.keys(matched).length;
  const cols = narrow ? config.narrowCols : config.cols;
  const rows = narrow ? config.narrowRows : config.rows;

  // Clear pending flip-backs when the game unmounts.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  // The clock runs from the first flip until the win, and pauses while the tab is hidden.
  useEffect(() => {
    if (!started || result) return;
    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible") setSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(tick);
  }, [started, result]);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function reset(next: Difficulty = difficulty) {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setDeck(newDeck(next));
    setFaceUp([]);
    setMatched({});
    setMoves(0);
    setStreak(0);
    setSeconds(0);
    setStarted(false);
    setLocked(false);
    setPeeking(false);
    setPeekUsed(false);
    setResult(null);
    setConfetti([]);
    announce(
      `New ${DIFFICULTIES[next].label.toLowerCase()} game. ${DIFFICULTIES[next].pairs * 2} cards, face down.`,
    );
  }

  function chooseDifficulty(next: Difficulty) {
    setStoredDifficulty(next);
    reset(next);
  }

  function win(totalMoves: number) {
    const best: PairsBest = {
      stars: starsFor(totalMoves, config.pairs, peekUsed),
      moves: totalMoves,
      seconds,
    };
    const key = GAME_KEYS.bestPairs(difficulty);
    const isNewBest = isBetter(best, readJson<PairsBest>(key));
    if (isNewBest) writeStored(key, JSON.stringify(best));
    setResult({ best, isNewBest });
    if (!reduced) {
      setConfetti(
        Array.from({ length: 28 }, (_, i) => ({
          x: (randomUnit() - 0.5) * 520,
          y: -80 - randomUnit() * 220,
          r: (randomUnit() - 0.5) * 540,
          colour: CONFETTI[i % CONFETTI.length]!,
          delay: randomUnit() * 0.15,
        })),
      );
    }
    if (soundOn) sounds.win();
    announce(
      `All pairs found in ${totalMoves} moves and ${formatClock(seconds)}. ${best.stars} of 3 stars.${isNewBest ? " New best!" : ""}`,
    );
  }

  function flip(index: number) {
    const card = deck[index];
    if (!card || locked || peeking || result) return;
    if (matched[card.pair] !== undefined || faceUp.includes(index)) return;
    if (!started) setStarted(true);
    if (soundOn) sounds.flip();

    if (faceUp.length === 0) {
      setFaceUp([index]);
      announce(`${card.text}`);
      return;
    }
    const first = deck[faceUp[0]!]!;
    const totalMoves = moves + 1;
    setMoves(totalMoves);
    setFaceUp([faceUp[0]!, index]);

    if (first.pair === card.pair && first.lang !== card.lang) {
      const colour = matchedCount % COLOURS.length;
      setMatched((m) => ({ ...m, [card.pair]: colour }));
      setFaceUp([]);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (soundOn) sounds.match();
      const en = first.lang === "en" ? first.text : card.text;
      const bn = first.lang === "bn" ? first.text : card.text;
      announce(`Match: ${en} and ${bn}.${nextStreak >= 2 ? ` Streak ${nextStreak}.` : ""}`);
      if (matchedCount + 1 === config.pairs) win(totalMoves);
    } else {
      setStreak(0);
      setLocked(true);
      if (soundOn) sounds.miss();
      announce(`${card.text}. Not a pair.`);
      later(() => {
        setFaceUp([]);
        setLocked(false);
      }, 700);
    }
  }

  function peek() {
    if (peekUsed || result || locked) return;
    setPeekUsed(true);
    setPeeking(true);
    if (!started) setStarted(true);
    announce("Peeking at all cards for one second. This costs one star.");
    later(() => setPeeking(false), 1000);
  }

  function onCardKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: cols,
      ArrowUp: -cols,
    };
    const step = moves[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const target = index + step;
    if (target >= 0 && target < deck.length) cardRefs.current[target]?.focus();
  }

  const fact = matchedCount >= 2 ? FACTS[(Math.floor(matchedCount / 2) - 1) % FACTS.length] : null;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Controls and stats */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 px-2.5">
            <ArrowLeft aria-hidden />
            Games
          </Button>
          <DifficultyPicker value={difficulty} onChange={chooseDifficulty} />
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs tabular-nums">
          <dl className="flex items-center gap-4">
            <div className="flex gap-1">
              <dt>Moves</dt>
              <dd className="text-foreground font-semibold">{moves}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Time</dt>
              <dd className="text-foreground font-semibold">{formatClock(seconds)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Pairs</dt>
              <dd className="text-foreground font-semibold">
                {matchedCount}/{config.pairs}
              </dd>
            </div>
          </dl>
          {streak >= 2 && (
            <motion.span
              key={streak}
              initial={reduced ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-semantic-soft text-semantic rounded-full px-2 py-0.5 font-semibold"
            >
              Streak ×{streak}
            </motion.span>
          )}
          <button
            type="button"
            onClick={peek}
            disabled={peekUsed || !!result}
            className="border-border hover:bg-muted focus-visible:ring-ring inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 font-medium outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
            title="Show every card for one second (costs one star)"
          >
            <Eye className="size-3.5" aria-hidden />
            {peekUsed ? "Peek used" : "Peek"}
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="relative min-h-0 flex-1">
        <div
          role="grid"
          aria-label={`Parallax Pairs, ${deck.length} cards`}
          className="mx-auto grid h-full max-h-full w-full max-w-[720px] gap-2 sm:gap-2.5"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {deck.map((card, i) => {
            const colourIndex = matched[card.pair];
            const isMatched = colourIndex !== undefined;
            const shown = isMatched || peeking || faceUp.includes(i);
            const colour = isMatched ? COLOURS[colourIndex] : undefined;
            const label = isMatched
              ? `Card ${i + 1}, ${card.text}, matched`
              : shown
                ? `Card ${i + 1} of ${deck.length}, ${card.text}, face up`
                : `Card ${i + 1} of ${deck.length}, face down`;
            return (
              <div key={card.key} role="gridcell" className="min-h-0 [perspective:900px]">
                <button
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  type="button"
                  aria-label={label}
                  onClick={() => flip(i)}
                  onKeyDown={(e) => onCardKey(e, i)}
                  className="focus-visible:ring-ring focus-visible:ring-offset-background relative block size-full min-h-11 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <span
                    className={cn(
                      "relative block size-full [transform-style:preserve-3d]",
                      !reduced && "transition-transform duration-300 ease-out",
                    )}
                    style={reduced ? undefined : { transform: shown ? "rotateY(180deg)" : "none" }}
                  >
                    {/* Back */}
                    <span
                      aria-hidden
                      className={cn(
                        "border-border absolute inset-0 grid place-items-center rounded-xl border [backface-visibility:hidden]",
                        "bg-[linear-gradient(135deg,var(--semantic-soft),var(--lexical-soft)_35%,var(--concept-soft)_65%,var(--structural-soft))]",
                        "shadow-[0_1px_2px_rgb(0_0_0/0.06)] hover:brightness-[1.03]",
                        reduced && "transition-opacity duration-200",
                      )}
                      style={reduced ? { opacity: shown ? 0 : 1 } : undefined}
                    >
                      <LogoMark className="size-[clamp(1.25rem,4vw,2rem)] opacity-80" />
                    </span>
                    {/* Front */}
                    <span
                      aria-hidden
                      className={cn(
                        "bg-card absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 px-1.5 [backface-visibility:hidden]",
                        reduced && "transition-opacity duration-200",
                      )}
                      style={{
                        transform: reduced ? undefined : "rotateY(180deg)",
                        opacity: reduced ? (shown ? 1 : 0) : undefined,
                        borderColor: colour ?? "var(--border)",
                        boxShadow: colour
                          ? `0 0 0 3px color-mix(in oklab, ${colour} 18%, transparent), 0 6px 18px -8px ${colour}`
                          : undefined,
                      }}
                    >
                      <span
                        className={cn(
                          "absolute top-1.5 left-1.5 rounded-md px-1 py-px text-[9px] leading-tight font-semibold tracking-wide sm:text-[10px]",
                          card.lang === "en"
                            ? "bg-muted text-muted-foreground"
                            : "bg-concept-soft text-concept",
                        )}
                        lang={card.lang === "bn" ? "bn" : undefined}
                      >
                        {card.lang === "en" ? "EN" : "বাংলা"}
                      </span>
                      {isMatched && (
                        <Check
                          className="absolute top-1.5 right-1.5 size-3.5 sm:size-4"
                          style={{ color: colour }}
                          strokeWidth={3}
                        />
                      )}
                      <span
                        lang={card.lang === "bn" ? "bn" : "en"}
                        className={cn(
                          "text-center font-semibold break-words",
                          card.lang === "bn"
                            ? "text-[clamp(1rem,3.2vw,1.6rem)] leading-[1.6]"
                            : "text-[clamp(0.8rem,2.4vw,1.25rem)] leading-tight",
                        )}
                      >
                        {card.text}
                      </span>
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {result && (
          <EndScreen
            result={result}
            seconds={seconds}
            difficulty={difficulty}
            reportReady={reportReady}
            confetti={confetti}
            onAgain={() => reset()}
            onDifficulty={chooseDifficulty}
            onBack={onBack}
            onViewReport={onViewReport}
          />
        )}
      </div>

      <p className="text-muted-foreground min-h-5 pt-3 text-center text-xs" aria-live="off">
        {fact && (
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="text-semantic size-3.5 shrink-0" aria-hidden />
            {fact}
          </span>
        )}
      </p>
    </div>
  );
}

function DifficultyPicker({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (value: Difficulty) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Difficulty"
      className="bg-muted inline-flex rounded-full p-0.5"
    >
      {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
        <button
          key={d}
          type="button"
          role="radio"
          aria-checked={value === d}
          onClick={() => value !== d && onChange(d)}
          className={cn(
            "focus-visible:ring-ring min-h-8 cursor-pointer rounded-full px-3 text-xs font-medium outline-none focus-visible:ring-2",
            value === d
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {DIFFICULTIES[d].label}
        </button>
      ))}
    </div>
  );
}

function Stars({ count, size = "size-7" }: { count: number; size?: string }) {
  return (
    <span className="inline-flex gap-1" role="img" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className={cn(size, n <= count ? "fill-[#f59e0b] text-[#f59e0b]" : "text-border")}
          aria-hidden
        />
      ))}
    </span>
  );
}

export { Stars };

function EndScreen({
  result,
  seconds,
  difficulty,
  reportReady,
  confetti,
  onAgain,
  onDifficulty,
  onBack,
  onViewReport,
}: {
  result: { best: PairsBest; isNewBest: boolean };
  seconds: number;
  difficulty: Difficulty;
  reportReady: boolean;
  confetti: Piece[];
  onAgain: () => void;
  onDifficulty: (d: Difficulty) => void;
  onBack: () => void;
  onViewReport: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const [changing, setChanging] = useState(false);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  return (
    <div className="bg-background/80 absolute inset-0 z-10 grid place-items-center rounded-2xl p-3 backdrop-blur-sm">
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2">
        {confetti.map((p, i) => (
          <motion.span
            key={i}
            className="absolute block h-2.5 w-1.5 rounded-[2px]"
            style={{ background: p.colour }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            animate={{ x: p.x, y: [0, p.y, p.y + 260], rotate: p.r, opacity: [1, 1, 0] }}
            transition={{ duration: 1.6, delay: p.delay, ease: "easeOut" }}
          />
        ))}
      </div>
      <motion.div
        initial={reduced ? false : { scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="border-border bg-card shadow-lift relative w-full max-w-sm rounded-2xl border p-6 text-center"
      >
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          All pairs found · {DIFFICULTIES[difficulty].label}
        </p>
        <div className="mt-3">
          <Stars count={result.best.stars} />
        </div>
        <p className="mt-3 text-sm">
          <span className="font-semibold">{result.best.moves}</span> moves ·{" "}
          <span className="font-semibold">{formatClock(seconds)}</span>
        </p>
        {result.isNewBest && <p className="text-semantic mt-1 text-sm font-semibold">New best!</p>}
        {changing ? (
          <div className="mt-5 flex justify-center">
            <DifficultyPicker
              value={difficulty}
              onChange={(d) => {
                setChanging(false);
                onDifficulty(d);
              }}
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-2">
            {reportReady && (
              <Button ref={first} onClick={onViewReport}>
                <FileText aria-hidden />
                View report
              </Button>
            )}
            <Button
              ref={reportReady ? undefined : first}
              variant={reportReady ? "outline" : "primary"}
              onClick={onAgain}
            >
              <RotateCcw aria-hidden />
              Play again
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => setChanging(true)}>
                Change difficulty
              </Button>
              <Button variant="outline" size="sm" onClick={onBack}>
                Back to games
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
