import { NextResponse } from "next/server";
import { delay, mockDisabled } from "@/lib/auth/mock-guard";
import { createSession, createUser } from "@/lib/auth/mock-store";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { signUpSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  const disabled = mockDisabled();
  if (disabled) return disabled;

  const body: unknown = await request.json().catch(() => null);
  // The client sends no confirmPassword/consent; re-check them here as already satisfied.
  const parsed = signUpSchema.safeParse(
    body && typeof body === "object"
      ? { ...body, confirmPassword: (body as { password?: unknown }).password, consent: true }
      : body,
  );
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check the form and try again.";
    return NextResponse.json({ message }, { status: 400 });
  }

  await delay();
  const { name, email, universityId, role, department, password } = parsed.data;
  const result = createUser({ name, email, universityId, role, department, password });
  if ("conflict" in result) {
    const message =
      result.conflict === "email"
        ? "An account with this email already exists."
        : "This student/staff ID is already registered.";
    return NextResponse.json({ message, field: result.conflict }, { status: 409 });
  }

  const res = NextResponse.json({ user: result.user }, { status: 201 });
  setSessionCookie(res, createSession(result.user.id), false);
  return res;
}
