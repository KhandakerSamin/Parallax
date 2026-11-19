"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Game preferences and best scores, kept only in this browser (localStorage).
 * Every read and write is guarded: private windows and blocked storage just fall
 * back to the defaults.
 */
export const GAME_KEYS = {
  /** "off" turns the invitation off; anything else means it is offered. */
  offer: "parallax.waitingGame",
  sound: "parallax.waitingGame.sound",
  difficulty: "parallax.waitingGame.difficulty",
  timed: "parallax.waitingGame.timed",
  bestPairs: (difficulty: string) => `parallax.waitingGame.best.pairs.${difficulty}`,
  bestMeaning: "parallax.waitingGame.best.meaning",
} as const;

const EVENT = "parallax:game-storage";

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function readJson<T>(key: string): T | null {
  const raw = readStored(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Whether a PDF analysis should offer the game. */
export function gameOffered(): boolean {
  return readStored(GAME_KEYS.offer) !== "off";
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** A stored string that re-renders when it changes (here or in another tab). */
export function useStored(key: string, fallback: string): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => readStored(key) ?? fallback,
    () => fallback,
  );
  const set = useCallback((next: string) => writeStored(key, next), [key]);
  return [value, set];
}
