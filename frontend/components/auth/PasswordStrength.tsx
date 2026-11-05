"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { PASSWORD_RULES, passwordScore } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";

const LEVELS = [
  { label: "Too weak", color: "var(--structural)" },
  { label: "Too weak", color: "var(--structural)" },
  { label: "Weak", color: "var(--structural)" },
  { label: "Fair", color: "var(--lexical)" },
  { label: "Good", color: "var(--semantic)" },
  { label: "Strong", color: "var(--concept)" },
] as const;

/** Animated strength bar plus a live checklist of the password requirements. */
export function PasswordStrength({ password, id }: { password: string; id: string }) {
  const score = passwordScore(password);
  const level = LEVELS[score] ?? LEVELS[0];

  return (
    <div id={id} className="space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full origin-left rounded-full"
            animate={{ scaleX: score / PASSWORD_RULES.length, backgroundColor: level.color }}
            initial={false}
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
          />
        </div>
        <span className="w-16 text-right text-xs font-medium" style={{ color: password ? level.color : undefined }} aria-live="polite">
          {password ? level.label : ""}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password);
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                met ? "text-concept" : "text-muted-foreground",
              )}
            >
              {met ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <X className="size-3.5" aria-hidden />}
              {rule.label}
              <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
