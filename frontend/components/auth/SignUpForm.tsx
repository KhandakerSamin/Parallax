"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useAnimationControls } from "framer-motion";
import { BookOpenCheck, GraduationCap, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ALLOWED_EMAIL_DOMAINS, DEPARTMENTS } from "@/lib/auth/config";
import { AuthError } from "@/lib/auth/types";
import { signUpSchema, type SignUpValues } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";
import { fieldA11y, FormField } from "./FormField";
import { PasswordInput } from "./PasswordInput";
import { PasswordStrength } from "./PasswordStrength";

const ROLE_OPTIONS = [
  { value: "student", label: "Student", icon: GraduationCap, desc: "Check work, explore prior projects" },
  { value: "reviewer", label: "Reviewer", icon: BookOpenCheck, desc: "Inspect matches, record decisions" },
] as const;

const selectClass =
  "h-11 w-full cursor-pointer rounded-xl border border-input bg-card px-3.5 text-base text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_22%,transparent)] aria-invalid:border-danger md:text-sm";

export function SignUpForm() {
  const { signUp } = useAuth();
  const router = useRouter();
  const shake = useAnimationControls();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      universityId: "",
      role: "student",
      department: "Software Engineering",
      password: "",
      confirmPassword: "",
      consent: false,
    },
  });
  const password = useWatch({ control, name: "password" });

  async function onSubmit(values: SignUpValues) {
    // confirmPassword and consent are checked client-side only; send the account fields.
    const { name, email, universityId, role, department, password: pw } = values;
    try {
      const user = await signUp({ name, email, universityId, role, department, password: pw });
      toast.success(`Account created. Welcome, ${user.name.split(" ")[0]}!`);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      void shake.start({ x: [0, -10, 10, -7, 7, -3, 3, 0], transition: { duration: 0.45 } });
      if (error instanceof AuthError && error.status === 409) {
        const field = error.message.toLowerCase().includes("email") ? "email" : "universityId";
        setError(field, { message: error.message }, { shouldFocus: true });
      }
      toast.error(error instanceof AuthError ? error.message : "Couldn't create your account. Please try again.");
    }
  }

  const err = (name: keyof SignUpValues) => errors[name]?.message;

  return (
    <motion.form animate={shake} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormField id="name" label="Full name" error={err("name")}>
        <Input {...register("name")} {...fieldA11y("name", err("name"))} autoComplete="name" disabled={isSubmitting} />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="email"
          label="University email"
          error={err("email")}
          hint={`@${ALLOWED_EMAIL_DOMAINS[0] ?? "diu.edu.bd"} address`}
        >
          <Input
            {...register("email")}
            {...fieldA11y("email", err("email"), true)}
            type="email"
            autoComplete="email"
            placeholder="name@diu.edu.bd"
            disabled={isSubmitting}
          />
        </FormField>
        <FormField id="universityId" label="Student / Staff ID" error={err("universityId")} hint="Unique per person">
          <Input
            {...register("universityId")}
            {...fieldA11y("universityId", err("universityId"), true)}
            autoComplete="off"
            placeholder="221-35-123"
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Role</legend>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Role" className="grid grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((opt) => {
                const checked = field.value === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      "relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                      checked ? "border-primary bg-semantic-soft" : "border-input hover:bg-muted",
                    )}
                  >
                    <input
                      type="radio"
                      name={field.name}
                      value={opt.value}
                      checked={checked}
                      onChange={() => field.onChange(opt.value)}
                      disabled={isSubmitting}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <opt.icon className={cn("size-4", checked ? "text-brand" : "text-muted-foreground")} aria-hidden />
                      {opt.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </label>
                );
              })}
            </div>
          )}
        />
        <p className="text-xs text-muted-foreground">Researcher and admin roles are assigned by an administrator.</p>
      </fieldset>

      <FormField id="department" label="Department" error={err("department")}>
        <select {...register("department")} {...fieldA11y("department", err("department"))} className={selectClass} disabled={isSubmitting}>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="password" label="Password" error={err("password")}>
        <PasswordInput
          {...register("password")}
          id="password"
          aria-invalid={err("password") ? true : undefined}
          aria-describedby={err("password") ? "password-error password-strength" : "password-strength"}
          autoComplete="new-password"
          disabled={isSubmitting}
        />
      </FormField>
      <PasswordStrength password={password} id="password-strength" />

      <FormField id="confirmPassword" label="Confirm password" error={err("confirmPassword")}>
        <PasswordInput
          {...register("confirmPassword")}
          {...fieldA11y("confirmPassword", err("confirmPassword"))}
          autoComplete="new-password"
          disabled={isSubmitting}
        />
      </FormField>

      <Controller
        control={control}
        name="consent"
        render={({ field }) => (
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
                onBlur={field.onBlur}
                aria-invalid={err("consent") ? true : undefined}
                aria-describedby={err("consent") ? "consent-error" : undefined}
                disabled={isSubmitting}
                className="mt-0.5"
              />
              <label htmlFor="consent" className="cursor-pointer text-sm leading-relaxed text-muted-foreground">
                I understand that Parallax reports <strong className="font-medium text-foreground">potential similarity, not a
                verdict</strong>, and that final academic judgment rests with human reviewers.
              </label>
            </div>
            {err("consent") && (
              <p id="consent-error" role="alert" className="text-xs font-medium text-danger">
                {err("consent")}
              </p>
            )}
          </div>
        )}
      />

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </motion.form>
  );
}
