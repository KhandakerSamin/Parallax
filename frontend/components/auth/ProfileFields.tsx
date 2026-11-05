"use client";

import { BookOpenCheck, GraduationCap } from "lucide-react";
import type { ComponentProps } from "react";
import { DEPARTMENTS } from "@/lib/auth/config";
import type { SELF_SIGNUP_ROLES } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

type SignupRole = (typeof SELF_SIGNUP_ROLES)[number];

const ROLE_OPTIONS = [
  {
    value: "student",
    label: "Student",
    icon: GraduationCap,
    desc: "Check work, explore prior projects",
  },
  {
    value: "reviewer",
    label: "Reviewer",
    icon: BookOpenCheck,
    desc: "Inspect matches, record decisions",
  },
] as const;

type RoleFieldProps = {
  name: string;
  value: SignupRole;
  onChange: (role: SignupRole) => void;
  disabled?: boolean;
};

/** Student / reviewer choice as two radio cards. */
export function RoleField({ name, value, onChange, disabled }: RoleFieldProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Role</legend>
      <div role="radiogroup" aria-label="Role" className="grid grid-cols-2 gap-3">
        {ROLE_OPTIONS.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "has-[:focus-visible]:ring-ring relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-colors has-[:focus-visible]:ring-2",
                checked ? "border-primary bg-semantic-soft" : "border-input hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                disabled={disabled}
                className="sr-only"
              />
              <span className="flex items-center gap-2 text-sm font-medium">
                <opt.icon
                  className={cn("size-4", checked ? "text-brand" : "text-muted-foreground")}
                  aria-hidden
                />
                {opt.label}
              </span>
              <span className="text-muted-foreground text-xs">{opt.desc}</span>
            </label>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        Researcher and admin roles are assigned by an administrator.
      </p>
    </fieldset>
  );
}

const selectClass =
  "h-11 w-full cursor-pointer rounded-xl border border-input bg-card px-3.5 text-base text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_22%,transparent)] aria-invalid:border-danger md:text-sm";

/** Department dropdown; spread react-hook-form's register() result into it. */
export function DepartmentSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(selectClass, className)} {...props}>
      {DEPARTMENTS.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}
