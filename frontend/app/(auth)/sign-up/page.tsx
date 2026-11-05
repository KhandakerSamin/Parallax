import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Create account — Parallax",
  description: "Create a Parallax account with your DIU university email.",
};

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
      <p className="text-muted-foreground mt-2">
        Use your Daffodil International University email.
      </p>
      <div className="mt-8">
        <SignUpForm />
      </div>
      <p className="text-muted-foreground mt-8 text-center text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-brand font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
