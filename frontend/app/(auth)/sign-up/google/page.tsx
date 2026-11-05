import type { Metadata } from "next";
import { GoogleCompleteForm } from "@/components/auth/GoogleCompleteForm";

export const metadata: Metadata = {
  title: "Finish signing up — Parallax",
  robots: { index: false, follow: false },
};

export default function GoogleSignUpPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Almost there</h1>
      <p className="text-muted-foreground mt-2">
        Google confirmed your DIU email. Add your ID and role to finish creating your account.
      </p>
      <div className="mt-8">
        <GoogleCompleteForm />
      </div>
    </>
  );
}
