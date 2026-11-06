"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { API_URL, USE_MOCK_AUTH } from "@/lib/auth/config";

/** Google's "G" mark. */
export function GoogleMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="#4285F4"
        d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"
      />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z" />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"
      />
    </svg>
  );
}

/** Messages for the `?error=` codes the backend's Google callback redirects with. */
const GOOGLE_ERRORS: Record<string, string> = {
  google_unavailable:
    "Google sign-in isn't set up on this server yet. Use your email and password.",
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in didn't complete. Please try again.",
  google_domain: "Use your DIU Google account (@diu.edu.bd or @daffodilvarsity.edu.bd).",
  google_conflict:
    "That email's Parallax account is linked to a different Google account. Sign in with your password.",
  google_disabled: "This account has been disabled. Contact an administrator.",
};

export function googleErrorMessage(code: string | null): string | null {
  return code ? (GOOGLE_ERRORS[code] ?? null) : null;
}

type GoogleButtonProps = {
  /** Same-site path to land on after signing in. */
  next?: string;
};

/**
 * "Continue with Google". A full-page navigation to the backend, which redirects to Google
 * and back. In mock mode there is no backend, so it only explains that.
 */
export function GoogleButton({ next = "/dashboard" }: GoogleButtonProps) {
  const [redirecting, setRedirecting] = useState(false);

  if (USE_MOCK_AUTH) {
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() =>
          toast.info("Google sign-in needs the backend", {
            description: "Turn off mock auth and start the API to use it.",
          })
        }
      >
        <GoogleMark />
        Continue with Google
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" size="lg" className="w-full">
      <a
        href={`${API_URL}/auth/google?next=${encodeURIComponent(next)}`}
        onClick={() => setRedirecting(true)}
        aria-disabled={redirecting || undefined}
      >
        {redirecting ? <Loader2 className="animate-spin" aria-hidden /> : <GoogleMark />}
        {redirecting ? "Opening Google…" : "Continue with Google"}
      </a>
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-xs" role="separator">
      <span className="bg-border h-px flex-1" />
      or
      <span className="bg-border h-px flex-1" />
    </div>
  );
}
