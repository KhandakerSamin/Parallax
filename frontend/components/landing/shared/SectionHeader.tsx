import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  id: string;
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

/** Eyebrow + H2 + intro used at the top of every landing section. */
export function SectionHeader({
  id,
  eyebrow,
  title,
  intro,
  align = "center",
  className,
}: SectionHeaderProps) {
  return (
    <Reveal
      as="header"
      className={cn(
        "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      <p className="text-brand text-sm font-semibold tracking-wide uppercase">{eyebrow}</p>
      <h2 id={id} className="text-h2 mt-3 text-balance">
        {title}
      </h2>
      {intro && (
        <p
          className={cn(
            "text-lead text-muted-foreground mt-5 max-w-[65ch] text-pretty",
            align === "center" && "mx-auto",
          )}
        >
          {intro}
        </p>
      )}
    </Reveal>
  );
}
