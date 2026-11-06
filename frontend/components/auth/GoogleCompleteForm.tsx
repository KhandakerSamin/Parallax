"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useAnimationControls } from "framer-motion";
import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { getGooglePending } from "@/lib/auth/api";
import { AuthError, type GooglePending } from "@/lib/auth/types";
import { googleCompleteSchema, type GoogleCompleteValues } from "@/lib/auth/validation";
import { fieldA11y, FormField } from "./FormField";
import { DepartmentSelect, RoleField } from "./ProfileFields";

type PendingState =
  | { status: "loading" }
  | { status: "ready"; pending: GooglePending }
  | { status: "expired"; message: string };

/** Second step of a first Google sign-in: the account needs an ID, role and department. */
export function GoogleCompleteForm() {
  const { completeGoogleSignUp } = useAuth();
  const router = useRouter();
  const shake = useAnimationControls();
  const [state, setState] = useState<PendingState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getGooglePending()
      .then((pending) => !cancelled && setState({ status: "ready", pending }))
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "expired",
          message:
            error instanceof AuthError && error.status === 401
              ? error.message
              : "We couldn't load your Google details. Please try again.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<GoogleCompleteValues>({
    resolver: zodResolver(googleCompleteSchema),
    mode: "onTouched",
    defaultValues: {
      universityId: "",
      role: "student",
      department: "Software Engineering",
      consent: false,
    },
  });

  async function onSubmit({ universityId, role, department }: GoogleCompleteValues) {
    try {
      const user = await completeGoogleSignUp({ universityId, role, department });
      toast.success(`Account created. Welcome, ${user.name.split(" ")[0]}!`);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      void shake.start({ x: [0, -10, 10, -7, 7, -3, 3, 0], transition: { duration: 0.45 } });
      if (error instanceof AuthError && error.status === 409) {
        setError("universityId", { message: error.message }, { shouldFocus: true });
      }
      if (error instanceof AuthError && error.status === 401) {
        setState({ status: "expired", message: error.message });
      }
      toast.error(
        error instanceof AuthError
          ? error.message
          : "Couldn't create your account. Please try again.",
      );
    }
  }

  if (state.status === "loading") {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading your Google details…
      </div>
    );
  }

  if (state.status === "expired") {
    return (
      <div className="space-y-5">
        <p
          role="alert"
          className="border-danger/30 bg-danger/5 rounded-xl border px-3.5 py-3 text-sm"
        >
          {state.message}
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  const err = (name: keyof GoogleCompleteValues) => errors[name]?.message;
  const { pending } = state;

  return (
    <motion.form animate={shake} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="border-border bg-muted/40 flex items-center gap-3 rounded-2xl border p-3.5">
        <UserAvatar name={pending.name} src={pending.picture} className="size-10" />
        <div className="min-w-0">
          <p className="truncate font-medium">{pending.name}</p>
          <p className="text-muted-foreground flex items-center gap-1.5 truncate text-sm">
            <MailCheck className="text-accent size-3.5 shrink-0" aria-hidden />
            {pending.email}
          </p>
        </div>
      </div>

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
          autoFocus
        />
      </FormField>

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
        {isSubmitting ? "Creating account…" : "Finish sign-up"}
      </Button>
    </motion.form>
  );
}
