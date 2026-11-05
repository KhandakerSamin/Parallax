"use client";

import { AlertDialog as AlertPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const AlertDialog = AlertPrimitive.Root;
export const AlertDialogTrigger = AlertPrimitive.Trigger;
export const AlertDialogAction = AlertPrimitive.Action;
export const AlertDialogCancel = AlertPrimitive.Cancel;

export function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof AlertPrimitive.Content>) {
  return (
    <AlertPrimitive.Portal>
      <AlertPrimitive.Overlay
        data-lenis-prevent
        className="fixed inset-0 z-50 bg-[#0b0f1a]/55 backdrop-blur-sm data-[state=closed]:animate-[fade-out_150ms_ease-in] data-[state=open]:animate-[fade-in_200ms_ease-out]"
      />
      <AlertPrimitive.Content
        className={cn(
          "border-border bg-card shadow-lift fixed top-1/2 left-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6",
          "data-[state=closed]:animate-[fade-out_150ms_ease-in] data-[state=open]:animate-[fade-in_200ms_ease-out]",
          className,
        )}
        {...props}
      />
    </AlertPrimitive.Portal>
  );
}

export function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof AlertPrimitive.Title>) {
  return <AlertPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />;
}

export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertPrimitive.Description>) {
  return (
    <AlertPrimitive.Description
      className={cn("text-muted-foreground mt-2 text-sm", className)}
      {...props}
    />
  );
}
