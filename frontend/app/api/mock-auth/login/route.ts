import { NextResponse } from "next/server";
import { delay, mockDisabled } from "@/lib/auth/mock-guard";
import { createSession, verifyCredentials } from "@/lib/auth/mock-store";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { signInSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  const disabled = mockDisabled();
  if (disabled) return disabled;

  const parsed = signInSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter your email or ID and password." }, { status: 400 });
  }

  await delay();
  const { identifier, password, remember } = parsed.data;
  const user = verifyCredentials(identifier, password);
  if (!user) {
    // Same message whether the account or the password is wrong.
    return NextResponse.json({ message: "Incorrect email/ID or password." }, { status: 401 });
  }

  const res = NextResponse.json({ user });
  setSessionCookie(res, createSession(user.id), remember);
  return res;
}
