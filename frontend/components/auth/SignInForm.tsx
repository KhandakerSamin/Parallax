"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useAnimationControls } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthError } from "@/lib/auth/types";
import { signInSchema, type SignInValues } from "@/lib/auth/validation";
import { fieldA11y, FormField } from "./FormField";
import { GoogleButton, OrDivider } from "./GoogleButton";
import { PasswordInput } from "./PasswordInput";

/** Only allow same-site relative redirects after sign-in. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function SignInForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shake = useAnimationControls();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { identifier: "", password: "", remember: false },
  });

  async function onSubmit(values: SignInValues) {
    try {
      const user = await signIn(values);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
      router.replace(safeNext(searchParams.get("next")));
      router.refresh();
    } catch (error) {
      void shake.start({ x: [0, -10, 10, -7, 7, -3, 3, 0], transition: { duration: 0.45 } });
      toast.error(error instanceof AuthError ? error.message : "Sign-in failed. Please try again.");
    }
  }

  return (
    <motion.form
      animate={shake}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5"
      aria-describedby="signin-demo"
    >
      <GoogleButton />
      <OrDivider />

      <FormField id="identifier" label="University email or student/staff ID" error={errors.identifier?.message}>
        <Input
          {...register("identifier")}
          {...fieldA11y("identifier", errors.identifier?.message)}
          autoComplete="username"
          placeholder="name@diu.edu.bd or 221-35-123"
          disabled={isSubmitting}
        />
      </FormField>

      <FormField
        id="password"
        label="Password"
        error={errors.password?.message}
        aside={
          <Link href="/forgot-password" className="text-xs font-medium text-brand hover:underline">
            Forgot password?
          </Link>
        }
      >
        <PasswordInput
          {...register("password")}
          {...fieldA11y("password", errors.password?.message)}
          autoComplete="current-password"
          disabled={isSubmitting}
        />
      </FormField>

      <Controller
        control={control}
        name="remember"
        render={({ field }) => (
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="remember"
              checked={field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
              disabled={isSubmitting}
            />
            <Label htmlFor="remember" className="font-normal text-muted-foreground">
              Remember me for 30 days
            </Label>
          </div>
        )}
      />

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>

      <p id="signin-demo" className="rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">
        Demo account (mock mode): <span className="font-mono text-foreground">student@diu.edu.bd</span> /{" "}
        <span className="font-mono text-foreground">Parallax#2026</span>
      </p>
    </motion.form>
  );
}
