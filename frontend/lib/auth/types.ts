export const ROLES = ["student", "reviewer", "researcher", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

/** Roles a person can pick at sign-up. Other roles are assigned by an admin. */
export const SELF_SIGNUP_ROLES = ["student", "reviewer"] as const satisfies readonly Role[];

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  reviewer: "Reviewer",
  researcher: "Researcher",
  admin: "Admin",
  super_admin: "Super Admin",
};

export type User = {
  id: string;
  name: string;
  email: string;
  /** Student or staff ID — unique per user (FR02). */
  universityId: string;
  role: Role;
  department: string;
};

export type SignInInput = {
  /** University email or student/staff ID. */
  identifier: string;
  password: string;
  remember: boolean;
};

export type SignUpInput = {
  name: string;
  email: string;
  universityId: string;
  role: (typeof SELF_SIGNUP_ROLES)[number];
  department: string;
  password: string;
};

/** What a first-time Google user adds; name and email come from Google. */
export type GoogleCompleteInput = Pick<SignUpInput, "universityId" | "role" | "department">;

export type GooglePending = { email: string; name: string };

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

/** Error returned by the auth API, with the HTTP status for branching (401, 409…). */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
