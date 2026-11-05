"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
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

/** "Continue with Google" — UI only for now; the OAuth handler is a stub. */
export function GoogleButton() {
  function handleClick() {
    // TODO: redirect to `${API_URL}/auth/google` once the backend OAuth route exists.
    toast.info("Google sign-in isn't connected yet", {
      description: "Use your university email and password for now.",
    });
  }

  return (
    <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleClick}>
      <GoogleMark />
      Continue with Google
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
