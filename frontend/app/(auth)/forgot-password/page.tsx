import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Reset password — Parallax" };

/** Placeholder until the backend password-reset flow exists. */
export default function ForgotPasswordPage() {
  return (
    <div className="text-center">
      <span className="bg-semantic-soft text-brand mx-auto grid size-14 place-items-center rounded-2xl">
        <KeyRound className="size-6" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Reset your password</h1>
      <p className="text-muted-foreground mt-3">
        Self-service password reset is coming soon. Until then, ask your department&apos;s Parallax
        administrator to reset it for you.
      </p>
      <Button asChild variant="outline" size="lg" className="mt-8">
        <Link href="/sign-in">Back to sign in</Link>
      </Button>
    </div>
  );
}
