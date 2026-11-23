"use client";

import { Gamepad2, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { Component, useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { GameWindowProps } from "./types";
import { GAME_KEYS, writeStored } from "./useGameStorage";

/**
 * Everything the Analyze page needs for the waiting game. The game window itself is
 * a separate chunk, loaded only when someone chooses to play.
 */
const WaitingGameWindow = dynamic(() => import("./WaitingGameWindow"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0b0f1a]/55 backdrop-blur-md">
      <Loader2 className="size-6 animate-spin text-white" aria-label="Loading the game" />
    </div>
  ),
});

/** If the game ever crashes, it closes quietly; the analysis is untouched. */
class GameErrorBoundary extends Component<
  { onCrash: () => void; children: ReactNode },
  { crashed: boolean }
> {
  override state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  override componentDidCatch() {
    this.props.onCrash();
  }

  override render() {
    return this.state.crashed ? null : this.props.children;
  }
}

export function WaitingGame(props: GameWindowProps) {
  return (
    <GameErrorBoundary onCrash={props.onClose}>
      <WaitingGameWindow {...props} />
    </GameErrorBoundary>
  );
}

export function WaitingGameInvite({
  open,
  onPlay,
  onDecline,
}: {
  open: boolean;
  onPlay: () => void;
  onDecline: () => void;
}) {
  const [dontAsk, setDontAsk] = useState(false);
  const checkboxId = useId();

  function decline() {
    if (dontAsk) writeStored(GAME_KEYS.offer, "off");
    onDecline();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && decline()}>
      <DialogContent className="max-w-md" closeLabel="Close">
        <span className="bg-semantic-soft text-semantic grid size-11 place-items-center rounded-2xl">
          <Gamepad2 className="size-5" aria-hidden />
        </span>
        <DialogTitle className="mt-4 text-lg font-semibold">Play while you wait?</DialogTitle>
        <DialogDescription className="text-muted-foreground mt-1.5 text-sm">
          Your report takes about 2–3 minutes. Want a quick game in the meantime?
        </DialogDescription>
        <p className="text-muted-foreground mt-2 text-xs">
          The analysis keeps running either way, and you can close the game at any time.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" className="sm:flex-1" onClick={decline} autoFocus>
            No thanks
          </Button>
          <Button
            className="sm:flex-1"
            onClick={() => {
              if (dontAsk) writeStored(GAME_KEYS.offer, "off");
              onPlay();
            }}
          >
            <Gamepad2 aria-hidden />
            Play a game
          </Button>
        </div>
        <label htmlFor={checkboxId} className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            id={checkboxId}
            checked={dontAsk}
            onCheckedChange={(v) => setDontAsk(v === true)}
          />
          Don&apos;t ask me again
        </label>
      </DialogContent>
    </Dialog>
  );
}
