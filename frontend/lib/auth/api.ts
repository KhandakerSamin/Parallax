import { AUTH_BASE } from "./config";
import {
  AuthError,
  type GoogleCompleteInput,
  type GooglePending,
  type SignInInput,
  type SignUpInput,
  type User,
} from "./types";

/**
 * Auth API client. Talks to the FastAPI backend (`${NEXT_PUBLIC_API_URL}/auth/*`) or to the
 * mock route handlers (/api/mock-auth/*), which share the same request/response shapes.
 * The session lives in an httpOnly cookie, so every call sends credentials.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${AUTH_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new AuthError("Can't reach the server. Check your connection and try again.", 0);
  }

  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  // A 5xx without our JSON body means the backend is down or the proxy could not reach it.
  if (res.status >= 500 && !(body && typeof body === "object" && "message" in body)) {
    throw new AuthError("Can't reach the server right now. Please try again shortly.", res.status);
  }
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : "Something went wrong. Please try again.";
    throw new AuthError(message, res.status);
  }
  return body as T;
}

export async function signIn(input: SignInInput): Promise<User> {
  const { user } = await request<{ user: User }>("/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return user;
}

export async function signUp(input: SignUpInput): Promise<User> {
  const { user } = await request<{ user: User }>("/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return user;
}

export async function signOut(): Promise<void> {
  await request<void>("/logout", { method: "POST" });
}

/** The signed-in user, or null when there is no valid session (200 {user:null} or 401). */
export async function getMe(): Promise<User | null> {
  try {
    const { user } = await request<{ user: User | null }>("/me", { method: "GET" });
    return user ?? null;
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) return null;
    throw error;
  }
}

/** The verified Google name and email waiting to finish sign-up (401 once it expires). */
export async function getGooglePending(): Promise<GooglePending> {
  return request<GooglePending>("/google/pending", { method: "GET" });
}

export async function completeGoogleSignUp(input: GoogleCompleteInput): Promise<User> {
  const { user } = await request<{ user: User }>("/google/complete", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return user;
}
