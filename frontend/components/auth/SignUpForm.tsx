"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useAnimationControls } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ALLOWED_EMAIL_DOMAINS } from "@/lib/auth/config";
import { AuthError } from "@/lib/auth/types";
import { signUpSchema, type SignUpValues } from "@/lib/auth/validation";
import { fieldA11y, FormField } from "./FormField";
import { PasswordInput } from "./PasswordInput";
import { DepartmentSelect, RoleField } from "./ProfileFields";
import { PasswordStrength } from "./PasswordStrength";

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
      toast.error(
        error instanceof AuthError
          ? error.message
          : "Couldn't create your account. Please try again.",
      );
    }
  }

  const err = (name: keyof SignUpValues) => errors[name]?.message;

  return (
    <motion.form animate={shake} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormField id="name" label="Full name" error={err("name")}>
        <Input
          {...register("name")}
          {...fieldA11y("name", err("name"))}
          autoComplete="name"
          disabled={isSubmitting}
        />
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
        <FormField
          id="universityId"
          label="Student / Staff ID"
          error={err("universityId")}
          hint="Unique per person"
        >
          <Input
            {...register("universityId")}
            {...fieldA11y("universityId", err("universityId"), true)}
            autoComplete="off"
            placeholder="221-35-123"
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <RoleField
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            disabled={isSubmitting}
          />
        )}
      />

      <FormField id="department" label="Department" error={err("department")}>
        <DepartmentSelect
          {...register("department")}
          {...fieldA11y("department", err("department"))}
          disabled={isSubmitting}
        />
      </FormField>

      <FormField id="password" label="Password" error={err("password")}>
        <PasswordInput
          {...register("password")}
          id="password"
          aria-invalid={err("password") ? true : undefined}
          aria-describedby={
            err("password") ? "password-error password-strength" : "password-strength"
          }
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
              <label
                htmlFor="consent"
                className="text-muted-foreground cursor-pointer text-sm leading-relaxed"
              >
                I understand that Parallax reports{" "}
                <strong className="text-foreground font-medium">
                  potential similarity, not a verdict
                </strong>
                , and that final academic judgment rests with human reviewers.
              </label>
            </div>
            {err("consent") && (
              <p id="consent-error" role="alert" className="text-danger text-xs font-medium">
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
