import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mockDisabled } from "@/lib/auth/mock-guard";
import { getSessionUser } from "@/lib/auth/mock-store";
import { clearSessionCookie, SESSION_COOKIE } from "@/lib/auth/session-cookie";

export async function GET() {
  const disabled = mockDisabled();
  if (disabled) return disabled;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = getSessionUser(token);
  if (!user) {
    // 200 with user: null — being signed out is a normal state, not an error.
    const res = NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
    // Drop a stale cookie (e.g. after a server restart) so proxy.ts stops treating it as signed in.
    if (token) clearSessionCookie(res);
    return res;
  }
  return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
