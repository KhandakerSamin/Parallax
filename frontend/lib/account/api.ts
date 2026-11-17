/**
 * The signed-in user's own account (Settings): profile, password and sessions.
 * Email, student/staff ID and role never change through these calls.
 */
import { AUTH_BASE } from "@/lib/auth/config";
import { AuthError, type User } from "@/lib/auth/types";

export type AccountSession = {
  id: string;
  userAgent: string | null;
  remember: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
};

export class AccountError extends AuthError {
  constructor(
    message: string,
    status: number,
    readonly field?: string,
  ) {
    super(message, status);
    this.name = "AccountError";
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${AUTH_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new AccountError("Can't reach the server. Check your connection and try again.", 0);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const message =
      typeof data.message === "string"
        ? data.message
        : res.status === 404
          ? "This feature isn't available on the server yet."
          : "Something went wrong. Please try again.";
    throw new AccountError(
      message,
      res.status,
      typeof data.field === "string" ? data.field : undefined,
    );
  }
  return body as T;
}

export async function updateProfile(change: { name?: string; department?: string }): Promise<User> {
  const { user } = await call<{ user: User }>("/me", {
    method: "PATCH",
    body: JSON.stringify(change),
  });
  return user;
}

/** Returns how many other signed-in browsers were signed out. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<number> {
  const { revoked } = await call<{ revoked: number }>("/me/password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return revoked;
}

export async function listSessions(): Promise<AccountSession[]> {
  const { sessions } = await call<{ sessions: AccountSession[] }>("/me/sessions");
  return sessions;
}

export async function revokeOtherSessions(): Promise<number> {
  const { revoked } = await call<{ revoked: number }>("/me/sessions/revoke-others", {
    method: "POST",
  });
  return revoked;
}

/** "Chrome on Windows" from a user-agent string; good enough to tell browsers apart. */
export function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Unknown browser";
  const ua = userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "A browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  return os ? `${browser} on ${os}` : browser;
}
