import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in — Parallax",
  description: "Sign in to Parallax with your DIU email or student/staff ID.",
};

export default function SignInPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="text-muted-foreground mt-2">Sign in to check documents and review matches.</p>
      <div className="mt-8">
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
      <p className="text-muted-foreground mt-8 text-center text-sm">
        New to Parallax?{" "}
        <Link href="/sign-up" className="text-brand font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
