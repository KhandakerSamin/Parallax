"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Gamepad2,
  Loader2,
  Minus,
  RefreshCw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LevelBadge } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GameHome, type GameId } from "./GameHome";
import { ParallaxPairs, formatClock } from "./ParallaxPairs";
import { SameMeaning } from "./SameMeaning";
import { sounds } from "./sounds";
import type { GameWindowProps, JobView } from "./types";
import { GAME_KEYS, useStored } from "./useGameStorage";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The game window. It only reads the analysis snapshot (`job`) and calls back to the
 * Analyze page; nothing in here starts, stops or slows the analysis.
 * Minimising hides the window but keeps it mounted, so the game state survives.
 */
export default function WaitingGameWindow({
  job,
  minimised,
  onMinimise,
  onRestore,
  onClose,
  onViewReport,
  onRetry,
}: GameWindowProps) {
  const reduced = useReducedMotion() ?? false;
  const [screen, setScreen] = useState<"home" | GameId>("home");
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [sound, setSound] = useStored(GAME_KEYS.sound, "off");
  const soundOn = sound === "on";
  const [message, setMessage] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const ready = job.status === "ready";
  const failed = job.status === "failed";

  const announce = useCallback((text: string) => {
    // Clear first so the same words are announced again.
    setMessage("");
    window.setTimeout(() => setMessage(text), 30);
  }, []);

  // One soft chime when the report becomes ready (only with sound on).
  useEffect(() => {
    if (ready && soundOn) sounds.chime();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chime once, on the change to ready
  }, [ready]);

  // Focus moves into the window when it opens or is restored, and back out when minimised.
  useEffect(() => {
    if (minimised) return;
    const before = document.activeElement as HTMLElement | null;
    const first = dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]");
    (first ?? dialogRef.current)?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (before && document.contains(before)) before.focus();
    };
  }, [minimised]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onMinimise();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null,
    );
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const gameProps = {
    soundOn,
    reportReady: ready,
    onViewReport,
    onBack: () => setScreen("home"),
    announce,
  };

  return (
    <>
      {/* Announcements: game events politely, the analysis outcome assertively. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {message}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {ready
          ? `Your report is ready. ${job.title}${job.level ? `, ${job.level} potential similarity` : ""}.`
          : failed
            ? `The analysis stopped at: ${job.error?.step ?? "an unknown step"}.`
            : ""}
      </div>

      {minimised && <MinimisedPill job={job} onRestore={onRestore} onViewReport={onViewReport} />}

      <div
        className={cn(
          "fixed inset-0 z-50 grid place-items-center bg-[#0b0f1a]/55 backdrop-blur-md sm:p-4",
          minimised && "hidden",
          !reduced && "animate-[fade-in_200ms_ease-out]",
        )}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="waiting-game-title"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={cn(
            "border-border bg-background shadow-lift relative flex flex-col overflow-hidden outline-none",
            "h-dvh w-full sm:h-[min(640px,88vh)] sm:w-[min(880px,92vw)] sm:rounded-3xl sm:border",
            !reduced && "animate-[modal-in_360ms_cubic-bezier(0.22,1,0.36,1)]",
          )}
        >
          <Header
            job={job}
            soundOn={soundOn}
            onSound={() => setSound(soundOn ? "off" : "on")}
            onMinimise={onMinimise}
            onClose={onClose}
            showReadyPill={ready && keepPlaying}
            onViewReport={onViewReport}
          />

          <AnimatePresence initial={false}>
            {ready && !keepPlaying && (
              <motion.div
                key="ready"
                initial={reduced ? { opacity: 0 } : { y: -24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { y: -24, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="border-success/30 bg-success/10 flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-6"
              >
                <CheckCircle2 className="text-success size-5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Your report is ready</p>
                  <p className="text-muted-foreground bn-aware flex items-center gap-2 truncate text-xs">
                    <span className="truncate">{job.title}</span>
                    {job.level && <LevelBadge level={job.level} size="sm" />}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={onViewReport} data-autofocus>
                    <FileText aria-hidden />
                    View report
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setKeepPlaying(true)}>
                    Keep playing
                  </Button>
                </div>
              </motion.div>
            )}
            {failed && (
              <motion.div
                key="failed"
                role="alert"
                initial={reduced ? { opacity: 0 } : { y: -24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="border-danger/40 bg-danger/5 flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-6"
              >
                <AlertTriangle className="text-danger size-5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-danger text-sm font-semibold">
                    Stopped at: {job.error?.step ?? "the analysis"}
                  </p>
                  <p className="text-xs">{job.error?.message}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={onRetry} data-autofocus>
                    <RefreshCw aria-hidden />
                    Try again
                  </Button>
                  <Button size="sm" variant="outline" onClick={onClose}>
                    Close game
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {screen === "home" && <GameHome onChoose={setScreen} status={job.status} />}
            {screen === "pairs" && <ParallaxPairs {...gameProps} />}
            {screen === "meaning" && <SameMeaning {...gameProps} />}
          </div>
        </div>
      </div>
    </>
  );
}

function Header({
  job,
  soundOn,
  onSound,
  onMinimise,
  onClose,
  showReadyPill,
  onViewReport,
}: {
  job: JobView;
  soundOn: boolean;
  onSound: () => void;
  onMinimise: () => void;
  onClose: () => void;
  showReadyPill: boolean;
  onViewReport: () => void;
}) {
  const percent = Math.round(job.progress * 100);
  return (
    <div className="border-border border-b px-4 pt-3 pb-2.5 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="bg-semantic-soft text-semantic grid size-8 shrink-0 place-items-center rounded-lg">
          <Gamepad2 className="size-4" aria-hidden />
        </span>
        <h2 id="waiting-game-title" className="text-sm font-semibold sm:text-base">
          Play while you wait
        </h2>
        {showReadyPill && (
          <button
            type="button"
            onClick={onViewReport}
            className="bg-success/10 text-success hover:bg-success/15 focus-visible:ring-ring inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-semibold outline-none focus-visible:ring-2"
          >
            <CheckCircle2 className="size-3.5" aria-hidden />
            Report ready · View
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <IconButton
            label={soundOn ? "Turn sound off" : "Turn sound on"}
            pressed={soundOn}
            onClick={onSound}
          >
            {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </IconButton>
          <IconButton label="Minimise game" onClick={onMinimise}>
            <Minus className="size-4" />
          </IconButton>
          <IconButton label="Close game" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
      </div>
      <div className="mt-2.5">
        <div
          className="bg-muted h-1.5 overflow-hidden rounded-full"
          role="progressbar"
          aria-label="Analysis progress (estimate)"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700",
              job.status === "failed"
                ? "bg-danger"
                : job.status === "ready"
                  ? "bg-success"
                  : "bg-primary",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 text-xs">
          {job.status === "running" && <Loader2 className="size-3 animate-spin" aria-hidden />}
          <span className="text-foreground font-medium">
            {job.status === "ready"
              ? "Report saved"
              : job.status === "failed"
                ? "Analysis stopped"
                : job.position
                  ? `Waiting in line: #${job.position}`
                  : job.step}
          </span>
          <span className="tabular-nums">· {formatClock(job.elapsed)} elapsed</span>
        </p>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-11 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2 sm:size-9"
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}

function MinimisedPill({
  job,
  onRestore,
  onViewReport,
}: {
  job: JobView;
  onRestore: () => void;
  onViewReport: () => void;
}) {
  const percent = Math.round(job.progress * 100);
  return (
    <div
      className="border-border bg-card shadow-lift fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-full border py-1.5 pr-1.5 pl-4 print:hidden"
      role="region"
      aria-label="Minimised game"
    >
      <span className="flex min-w-0 items-center gap-2 text-xs">
        {job.status === "ready" ? (
          <CheckCircle2 className="text-success size-4" aria-hidden />
        ) : job.status === "failed" ? (
          <AlertTriangle className="text-danger size-4" aria-hidden />
        ) : (
          <Loader2 className="text-brand size-4 animate-spin" aria-hidden />
        )}
        <span className="font-medium">
          {job.status === "ready"
            ? "Report ready"
            : job.status === "failed"
              ? "Analysis stopped"
              : `Analyzing · ${percent}%`}
        </span>
      </span>
      {job.status === "ready" && (
        <Button size="sm" onClick={onViewReport} className="h-9">
          View
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={onRestore} className="h-9">
        <Gamepad2 aria-hidden />
        Resume game
      </Button>
    </div>
  );
}
