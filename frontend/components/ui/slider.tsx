"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/utils";

type SliderProps = ComponentProps<typeof SliderPrimitive.Root> & {
  /** CSS colour for the filled range and thumb ring. */
  color?: string;
  thumbLabel?: string;
};

export function Slider({ className, color, thumbLabel, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50",
        className,
      )}
      style={{ "--slider": color ?? "var(--primary)" } as CSSProperties}
      {...props}
    >
      <SliderPrimitive.Track className="bg-muted relative h-2 w-full grow overflow-hidden rounded-full">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-[var(--slider)]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={thumbLabel}
        className="bg-card shadow-soft block size-5 cursor-grab rounded-full border-2 border-[var(--slider)] transition-transform hover:scale-110 focus-visible:scale-110 active:cursor-grabbing"
      />
    </SliderPrimitive.Root>
  );
}
