import { AUTH_BASE } from "./config";
import { AuthError, type SignInInput, type SignUpInput, type User } from "./types";

/**
 * Auth API client. Talks to the mock route handlers (/api/mock-auth/*) or to the
 * Express API (`${NEXT_PUBLIC_API_URL}/auth/*`) with the same request/response shapes.
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
  const { user } = await request<{ user: User }>("/login", { method: "POST", body: JSON.stringify(input) });
  return user;
}

export async function signUp(input: SignUpInput): Promise<User> {
  const { user } = await request<{ user: User }>("/register", { method: "POST", body: JSON.stringify(input) });
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
