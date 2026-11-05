"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "@/lib/auth/api";
import type {
  AuthStatus,
  GoogleCompleteInput,
  Role,
  SignInInput,
  SignUpInput,
  User,
} from "@/lib/auth/types";

type AuthContextValue = {
  user: User | null;
  role: Role | null;
  status: AuthStatus;
  signIn: (input: SignInInput) => Promise<User>;
  signUp: (input: SignUpInput) => Promise<User>;
  /** Finishes a first-time Google sign-in with the fields Google doesn't provide. */
  completeGoogleSignUp: (input: GoogleCompleteInput) => Promise<User>;
  /** Ends the session and returns to the landing page. */
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    authApi
      .getMe()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus(me ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (!cancelled) setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (input: SignInInput) => {
    const me = await authApi.signIn(input);
    setUser(me);
    setStatus("authenticated");
    return me;
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const me = await authApi.signUp(input);
    setUser(me);
    setStatus("authenticated");
    return me;
  }, []);

  const completeGoogleSignUp = useCallback(async (input: GoogleCompleteInput) => {
    const me = await authApi.completeGoogleSignUp(input);
    setUser(me);
    setStatus("authenticated");
    return me;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.signOut();
    } finally {
      // Clear local state even if the network call failed.
      setUser(null);
      setStatus("unauthenticated");
      router.replace("/");
      router.refresh();
    }
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      status,
      signIn,
      signUp,
      completeGoogleSignUp,
      signOut,
    }),
    [user, status, signIn, signUp, completeGoogleSignUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
