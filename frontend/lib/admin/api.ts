import { API_URL } from "@/lib/auth/config";
import type { Role } from "@/lib/auth/types";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  universityId: string;
  role: Role;
  department: string;
  isActive: boolean;
  googleLinked: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  reportCount: number;
};

export type AdminStats = {
  users: number;
  activeUsers: number;
  usersByRole: Record<Role, number>;
  reports: number;
  reportsByLevel: Record<"low" | "moderate" | "high", number>;
  reviewsByStatus: Record<"pending" | "cleared" | "follow_up", number>;
};

export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/admin${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new AdminError("Can't reach the server. Check your connection and try again.", 0);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : res.status === 404
          ? "This feature isn't available on the server yet."
          : "Something went wrong. Please try again.";
    throw new AdminError(message, res.status);
  }
  return body as T;
}

export const getStats = () => call<AdminStats>("/stats");

export function listUsers(filters: { q?: string; role?: Role }) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.role) params.set("role", filters.role);
  return call<{ users: AdminUser[]; total: number }>(`/users${params.size ? `?${params}` : ""}`);
}

export function updateUser(id: string, change: { role?: Role; isActive?: boolean }) {
  return call<AdminUser>(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(change),
  });
}
