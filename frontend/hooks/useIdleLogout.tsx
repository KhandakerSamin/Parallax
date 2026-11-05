"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from "@/lib/auth/config";

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;
const WARNING_TOAST_ID = "idle-warning";

/**
 * Signs the user out after a period of inactivity (session NFR), showing a warning toast
 * one minute before. Checking elapsed time on an interval stays correct even if the tab sleeps.
 */
export function useIdleLogout(timeoutMs = IDLE_TIMEOUT_MS, warningMs = IDLE_WARNING_MS) {
  const { status, signOut } = useAuth();
  const lastActivity = useRef(0);
  const warned = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    lastActivity.current = Date.now();
    warned.current = false;

    const markActive = () => {
      lastActivity.current = Date.now();
      if (warned.current) {
        warned.current = false;
        toast.dismiss(WARNING_TOAST_ID);
      }
    };
    for (const event of ACTIVITY_EVENTS)
      window.addEventListener(event, markActive, { passive: true });

    const timer = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= timeoutMs) {
        window.clearInterval(timer);
        toast.dismiss(WARNING_TOAST_ID);
        void signOut().then(() => toast.info("You were signed out after a period of inactivity."));
      } else if (!warned.current && idle >= timeoutMs - warningMs) {
        warned.current = true;
        toast.warning("You'll be signed out in 1 minute", {
          id: WARNING_TOAST_ID,
          description: "Move the mouse or press a key to stay signed in.",
          duration: warningMs,
          action: { label: "Stay signed in", onClick: markActive },
        });
      }
    }, 5_000);

    return () => {
      window.clearInterval(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, markActive);
    };
  }, [status, signOut, timeoutMs, warningMs]);
}

/** Mount once inside <AuthProvider> to enable idle sign-out app-wide. */
export function IdleLogout() {
  useIdleLogout();
  return null;
}
