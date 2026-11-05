"use client";

import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetTitle = SheetPrimitive.Title;
export const SheetDescription = SheetPrimitive.Description;

/** Right-side drawer. Radix locks body scroll and traps focus while open. */
export function SheetContent({
  className,
  children,
  ...props
}: ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        data-lenis-prevent
        className="fixed inset-0 z-50 bg-[#0b0f1a]/50 backdrop-blur-sm data-[state=closed]:animate-[fade-out_200ms_ease-in] data-[state=open]:animate-[fade-in_200ms_ease-out]"
      />
      <SheetPrimitive.Content
        data-lenis-prevent
        className={cn(
          "border-border bg-background shadow-lift fixed inset-y-0 right-0 z-50 flex w-[min(22rem,88vw)] flex-col border-l p-6",
          "data-[state=closed]:animate-[sheet-out_220ms_ease-in] data-[state=open]:animate-[sheet-in_320ms_cubic-bezier(0.22,1,0.36,1)]",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-5 right-5 grid size-10 cursor-pointer place-items-center rounded-full transition-colors"
          aria-label="Close menu"
        >
          <X className="size-5" aria-hidden />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
