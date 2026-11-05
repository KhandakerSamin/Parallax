"use client";

import { ChevronDown } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-border border-b", className)} {...props} />;
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group hover:text-brand flex flex-1 cursor-pointer items-center justify-between gap-4 py-5 text-left text-base font-medium transition-colors md:text-lg",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          aria-hidden
          className="text-muted-foreground size-5 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-[accordion-up_250ms_ease-out] data-[state=open]:animate-[accordion-down_300ms_cubic-bezier(0.22,1,0.36,1)]"
      {...props}
    >
      <div className={cn("text-muted-foreground max-w-[70ch] pb-6", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
