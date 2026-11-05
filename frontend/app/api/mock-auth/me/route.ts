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
    const res = NextResponse.json({ message: "Not signed in." }, { status: 401 });
    // Drop a stale cookie (e.g. after a server restart) so proxy.ts stops treating it as signed in.
    if (token) clearSessionCookie(res);
    return res;
  }
  return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
