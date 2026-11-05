"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  closeLabel?: string;
};

/**
 * Centered modal. The overlay doubles as the centering grid, so the content's own
 * transform is free for the enter/exit animation. Radix traps focus and locks scroll.
 */
export function DialogContent({
  className,
  children,
  closeLabel = "Close",
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-lenis-prevent
        className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#0b0f1a]/55 p-4 backdrop-blur-md data-[state=closed]:animate-[fade-out_200ms_ease-in] data-[state=open]:animate-[fade-in_200ms_ease-out]"
      >
        <DialogPrimitive.Content
          className={cn(
            "border-border bg-background shadow-lift relative w-full max-w-md rounded-3xl border p-6 outline-none",
            "data-[state=closed]:animate-[modal-out_180ms_ease-in] data-[state=open]:animate-[modal-in_360ms_cubic-bezier(0.22,1,0.36,1)]",
            className,
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring absolute top-4 right-4 grid size-10 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
            aria-label={closeLabel}
          >
            <X className="size-5" aria-hidden />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  );
}
