"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};

/** True only after hydration, so server and first client render match. */
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * Light/dark switch. The knob is a smiling sun on a sky track in light mode and
 * slides over to become a sleepy moon on a starry track in dark mode.
 * Visual state comes from the `dark` class (no flash); ARIA state waits for mount.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={mounted ? isDark : undefined}
      aria-label="Dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "group theme-switch focus-visible:ring-ring focus-visible:ring-offset-background relative inline-flex h-8 w-[3.75rem] shrink-0 items-center overflow-hidden rounded-full border border-sky-300/70 bg-gradient-to-b from-sky-300 to-sky-200 p-0.5 shadow-inner transition-colors duration-500 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-indigo-400/30 dark:from-slate-900 dark:to-indigo-950",
        className,
      )}
    >
      {/* Sky scenery: clouds by day, stars by night */}
      <span aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute top-[0.55rem] right-[0.55rem] h-1.5 w-3.5 rounded-full bg-white/90 transition-all duration-500 dark:translate-y-3 dark:opacity-0" />
        <span className="absolute right-[1.1rem] bottom-[0.45rem] h-1 w-2.5 rounded-full bg-white/80 transition-all duration-500 dark:translate-y-3 dark:opacity-0" />
        <span className="absolute top-1.5 left-2 size-[3px] -translate-y-3 rounded-full bg-white opacity-0 transition-all delay-100 duration-500 dark:translate-y-0 dark:opacity-100" />
        <span className="absolute top-4 left-4 size-[2px] -translate-y-3 rounded-full bg-white/80 opacity-0 transition-all delay-150 duration-500 dark:translate-y-0 dark:opacity-100" />
        <span className="absolute bottom-1.5 left-2.5 size-[2px] -translate-y-3 rounded-full bg-white/70 opacity-0 transition-all delay-200 duration-500 dark:translate-y-0 dark:opacity-100" />
        <span className="theme-switch-twinkle absolute top-2 left-[1.45rem] size-[2px] -translate-y-3 rounded-full bg-white opacity-0 transition-all delay-200 duration-500 dark:translate-y-0 dark:opacity-100" />
      </span>

      {/* Knob */}
      <span
        aria-hidden
        className="theme-switch-knob relative z-10 grid size-[1.625rem] place-items-center rounded-full dark:translate-x-[1.75rem]"
      >
        <SunFace className="theme-switch-sun absolute inset-0" />
        <MoonFace className="theme-switch-moon absolute inset-0" />
      </span>
    </button>
  );
}

function SunFace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 26" className={className}>
      <g className="theme-switch-rays" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line key={deg} x1="13" y1="1.6" x2="13" y2="3.6" transform={`rotate(${deg} 13 13)`} />
        ))}
      </g>
      <circle cx="13" cy="13" r="8" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
      <circle cx="10.4" cy="11.8" r="1" fill="#78350f" />
      <circle cx="15.6" cy="11.8" r="1" fill="#78350f" />
      <circle cx="8.9" cy="14.6" r="1.1" fill="#fb7185" opacity="0.55" />
      <circle cx="17.1" cy="14.6" r="1.1" fill="#fb7185" opacity="0.55" />
      <path
        d="M10.6 15.1 Q13 17.4 15.4 15.1"
        fill="none"
        stroke="#78350f"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonFace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 26" className={className}>
      <circle cx="13" cy="13" r="11" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
      <circle cx="18.2" cy="8" r="1.8" fill="#cbd5e1" />
      <circle cx="7.6" cy="17.6" r="1.3" fill="#cbd5e1" />
      <circle cx="17.4" cy="18.2" r="0.9" fill="#cbd5e1" />
      {/* Sleepy closed eyes */}
      <path
        d="M8.6 12 Q10 13.3 11.4 12 M14.6 12 Q16 13.3 17.4 12"
        fill="none"
        stroke="#334155"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M11.6 15.6 Q13 16.6 14.4 15.6"
        fill="none"
        stroke="#334155"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
