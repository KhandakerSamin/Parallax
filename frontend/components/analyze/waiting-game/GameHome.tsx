"use client";

import { ArrowRight, Languages, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { DIFFICULTIES, Stars, type Difficulty, type PairsBest } from "./ParallaxPairs";
import { GAME_KEYS, useStored } from "./useGameStorage";

export type GameId = "pairs" | "meaning";

function parseBest(raw: string): PairsBest | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PairsBest;
  } catch {
    return null;
  }
}

export function GameHome({
  onChoose,
  status,
}: {
  onChoose: (game: GameId) => void;
  status: "running" | "ready" | "failed";
}) {
  const [easy] = useStored(GAME_KEYS.bestPairs("easy"), "");
  const [normal] = useStored(GAME_KEYS.bestPairs("normal"), "");
  const [hard] = useStored(GAME_KEYS.bestPairs("hard"), "");
  const [meaning] = useStored(GAME_KEYS.bestMeaning, "");
  const bests: [Difficulty, PairsBest | null][] = [
    ["easy", parseBest(easy)],
    ["normal", parseBest(normal)],
    ["hard", parseBest(hard)],
  ];
  const anyPairs = bests.some(([, b]) => b);

  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-muted-foreground mb-4 text-center text-sm">
        {status === "running"
          ? "Pick a game. Your analysis keeps running in the background."
          : status === "ready"
            ? "Pick a game. Your report is saved and waiting for you."
            : "Pick a game, or try the analysis again above."}
      </p>
      <div className="mx-auto grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        <GameCard
          onClick={() => onChoose("pairs")}
          icon={<LayoutGrid className="size-5" aria-hidden />}
          tint="semantic"
          title="Parallax Pairs"
          tag="Memory · about 1 minute"
          description="Flip cards to match each English word with its Bangla meaning."
        >
          {anyPairs ? (
            <ul className="space-y-1">
              {bests.map(([d, best]) =>
                best ? (
                  <li key={d} className="flex items-center justify-between gap-2">
                    <span>{DIFFICULTIES[d].label}</span>
                    <span className="flex items-center gap-2">
                      <Stars count={best.stars} size="size-3.5" />
                      <span className="tabular-nums">{best.moves} moves</span>
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
          ) : (
            <span>No best score yet</span>
          )}
        </GameCard>
        <GameCard
          onClick={() => onChoose("meaning")}
          icon={<Languages className="size-5" aria-hidden />}
          tint="concept"
          title="Same Meaning?"
          tag="Quick-fire · 10 rounds"
          description="An English and a Bangla sentence: same meaning, or just similar words?"
        >
          {meaning ? <span>Best: {meaning}/10</span> : <span>No best score yet</span>}
        </GameCard>
      </div>
    </div>
  );
}

function GameCard({
  onClick,
  icon,
  tint,
  title,
  tag,
  description,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  tint: "semantic" | "concept";
  title: string;
  tag: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group border-border bg-card hover:border-ring/50 focus-visible:ring-ring flex cursor-pointer flex-col rounded-2xl border p-5 text-left transition-[border-color,box-shadow,transform] outline-none hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-16px_var(--shadow-color)] focus-visible:ring-2"
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-xl",
          tint === "semantic" ? "bg-semantic-soft text-semantic" : "bg-concept-soft text-concept",
        )}
      >
        {icon}
      </span>
      <span className="mt-4 text-base font-semibold">{title}</span>
      <span className="text-muted-foreground mt-0.5 text-xs">{tag}</span>
      <span className="mt-3 text-sm">{description}</span>
      <span className="border-border text-muted-foreground mt-4 border-t pt-3 text-xs">
        {children}
      </span>
      <span className="text-brand mt-4 inline-flex items-center gap-1 text-sm font-medium">
        Play
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </button>
  );
}
