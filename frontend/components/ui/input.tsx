import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "border-input bg-card text-foreground placeholder:text-muted-foreground/80 h-11 w-full min-w-0 rounded-xl border px-3.5 text-base shadow-xs transition-[border-color,box-shadow] outline-none md:text-sm",
        "focus-visible:border-ring focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_22%,transparent)] focus-visible:outline-none",
        "aria-invalid:border-danger aria-invalid:focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--danger)_20%,transparent)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
