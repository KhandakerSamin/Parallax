import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-muted-foreground",
        brand: "border-transparent bg-semantic-soft text-brand",
        accent: "border-transparent bg-accent-soft text-accent",
        lexical: "border-transparent bg-lexical-soft text-lexical",
        semantic: "border-transparent bg-semantic-soft text-semantic",
        concept: "border-transparent bg-concept-soft text-concept",
        structural: "border-transparent bg-structural-soft text-structural",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
