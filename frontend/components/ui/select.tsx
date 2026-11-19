"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export type SelectOption<T extends string = string> = { value: T; label: string };

/** Radix does not allow an empty-string item value, so "" travels as this token. */
const EMPTY = "__empty__";

/**
 * A styled dropdown (Radix Select): keyboard and screen-reader friendly,
 * a rounded floating panel instead of the browser's native list.
 */
export function Select<T extends string>({
  value,
  onValueChange,
  options,
  id,
  disabled,
  size = "md",
  className,
  contentClassName,
  "aria-label": ariaLabel,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  id?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
}) {
  const encode = (v: string) => (v === "" ? EMPTY : v);
  return (
    <SelectPrimitive.Root
      value={encode(value)}
      onValueChange={(v) => onValueChange((v === EMPTY ? "" : v) as T)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "group border-input bg-card text-foreground inline-flex cursor-pointer items-center justify-between gap-2 border text-left whitespace-nowrap shadow-xs outline-none",
          "hover:border-ring/60 hover:bg-muted/40 transition-[border-color,box-shadow,background-color]",
          "focus-visible:border-ring focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_22%,transparent)]",
          "data-[state=open]:border-ring data-[state=open]:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_18%,transparent)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          size === "sm" ? "h-8 rounded-lg px-2.5 text-xs" : "h-11 rounded-xl px-3.5 text-sm",
          className,
        )}
      >
        <span className="truncate">
          <SelectPrimitive.Value />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            className={cn(
              "text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180",
              size === "sm" ? "size-3.5" : "size-4",
            )}
            aria-hidden
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            "border-border bg-card text-card-foreground shadow-lift z-50 max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border p-1.5",
            "origin-[var(--radix-select-content-transform-origin)] data-[state=closed]:animate-[pop-out_120ms_ease-in] data-[state=open]:animate-[pop-in_160ms_ease-out]",
            contentClassName,
          )}
        >
          <SelectPrimitive.Viewport>
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={encode(o.value)}
                className={cn(
                  "relative flex cursor-pointer items-center gap-2 rounded-xl py-2 pr-9 pl-3 text-sm outline-none select-none",
                  "data-[highlighted]:bg-muted data-[state=checked]:text-brand data-[state=checked]:font-medium",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                )}
              >
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex">
                  <Check className="size-4" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
