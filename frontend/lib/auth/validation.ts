import { z } from "zod";
import { ALLOWED_EMAIL_DOMAINS, DEPARTMENTS } from "./config";
import { SELF_SIGNUP_ROLES } from "./types";

/** True when the email's domain is an allowed university domain (subdomains count). */
export function isAllowedEmail(email: string, domains: readonly string[] = ALLOWED_EMAIL_DOMAINS): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return domains.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export const UNIVERSITY_ID_PATTERN = /^[A-Za-z0-9-]{4,20}$/;

/** Password requirements, shown live as a checklist on sign-up. */
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "lower", label: "A lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "upper", label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "number", label: "A number", test: (p: string) => /\d/.test(p) },
  { id: "symbol", label: "A symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export function passwordScore(password: string): number {
  return PASSWORD_RULES.filter((rule) => rule.test(password)).length;
}

export const signInSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your university email or student/staff ID")
    .refine(
      (v) => (v.includes("@") ? z.email().safeParse(v).success : UNIVERSITY_ID_PATTERN.test(v)),
      "Enter a valid email address or ID",
    ),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean(),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
    email: z
      .email("Enter a valid email address")
      .trim()
      .toLowerCase()
      .refine((v) => isAllowedEmail(v), {
        message: `Use your university email (${ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join(" or ")})`,
      }),
    universityId: z
      .string()
      .trim()
      .regex(UNIVERSITY_ID_PATTERN, "Use 4–20 letters, numbers or dashes, e.g. 221-35-123"),
    role: z.enum(SELF_SIGNUP_ROLES, { error: "Choose a role" }),
    department: z.enum(DEPARTMENTS, { error: "Choose your department" }),
    password: z
      .string()
      .refine((p) => PASSWORD_RULES.every((rule) => rule.test(p)), "Password doesn't meet all requirements"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    consent: z.boolean().refine((v) => v, "Please confirm you understand how results are reported"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type SignUpValues = z.infer<typeof signUpSchema>;
