import "server-only";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { Role, User } from "./types";

/**
 * In-memory user + session store for the mock auth adapter (development / demos only).
 * Passwords are stored as salted scrypt hashes, never in plain text.
 * Data resets when the server restarts.
 */
type StoredUser = User & { passwordHash: string };
type Store = { users: Map<string, StoredUser>; sessions: Map<string, string> };

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function seed(): Store {
  const users = new Map<string, StoredUser>();
  const demo: Array<Omit<User, "id"> & { password: string }> = [
    {
      name: "Demo Student",
      email: "student@diu.edu.bd",
      universityId: "221-35-001",
      role: "student",
      department: "Software Engineering",
      password: "Parallax#2026",
    },
    {
      name: "Demo Reviewer",
      email: "reviewer@diu.edu.bd",
      universityId: "STAFF-0042",
      role: "reviewer",
      department: "Software Engineering",
      password: "Parallax#2026",
    },
  ];
  for (const { password, ...user } of demo) {
    const id = randomUUID();
    users.set(id, { ...user, id, passwordHash: hashPassword(password) });
  }
  return { users, sessions: new Map() };
}

// Keep one store across hot reloads in development.
const globalStore = globalThis as typeof globalThis & { __parallaxMockAuth?: Store };
const store = (globalStore.__parallaxMockAuth ??= seed());

function toPublic(stored: StoredUser): User {
  const { id, name, email, universityId, role, department } = stored;
  return { id, name, email, universityId, role, department };
}

function findByIdentifier(identifier: string): StoredUser | undefined {
  const needle = identifier.trim().toLowerCase();
  for (const user of store.users.values()) {
    if (user.email === needle || user.universityId.toLowerCase() === needle) return user;
  }
  return undefined;
}

export function verifyCredentials(identifier: string, password: string): User | null {
  const user = findByIdentifier(identifier);
  // Hash even when the user doesn't exist so timing doesn't reveal which accounts exist.
  const ok = user ? verifyPassword(password, user.passwordHash) : (hashPassword(password), false);
  return ok && user ? toPublic(user) : null;
}

export type CreateUserResult = { user: User } | { conflict: "email" | "universityId" };

export function createUser(
  input: Omit<User, "id"> & { password: string; role: Role },
): CreateUserResult {
  const email = input.email.trim().toLowerCase();
  for (const u of store.users.values()) {
    if (u.email === email) return { conflict: "email" };
    if (u.universityId.toLowerCase() === input.universityId.trim().toLowerCase()) {
      return { conflict: "universityId" };
    }
  }
  const { password, ...rest } = input;
  const id = randomUUID();
  const stored: StoredUser = { ...rest, email, id, passwordHash: hashPassword(password) };
  store.users.set(id, stored);
  return { user: toPublic(stored) };
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString("base64url");
  store.sessions.set(token, userId);
  return token;
}

export function getSessionUser(token: string | undefined): User | null {
  if (!token) return null;
  const userId = store.sessions.get(token);
  const user = userId ? store.users.get(userId) : undefined;
  return user ? toPublic(user) : null;
}

export function deleteSession(token: string | undefined): void {
  if (token) store.sessions.delete(token);
}
