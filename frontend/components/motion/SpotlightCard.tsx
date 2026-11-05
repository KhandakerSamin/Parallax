"use client";

import type { ComponentProps, CSSProperties, PointerEvent } from "react";
import { cn } from "@/lib/utils";

type SpotlightCardProps = ComponentProps<"div"> & {
  /** CSS colour of the glow; defaults to the primary colour. */
  spotColor?: string;
};

/** A card with a soft radial glow that follows a mouse pointer (desktop only, via CSS). */
export function SpotlightCard({ className, spotColor, style, children, ...props }: SpotlightCardProps) {
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--y", `${event.clientY - rect.top}px`);
  }

  return (
    <div
      onPointerMove={onPointerMove}
      className={cn(
        "spotlight rounded-[var(--radius-card)] border border-border bg-card shadow-soft",
        className,
      )}
      style={{ ...(spotColor ? { "--spot": spotColor } : {}), ...style } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}
