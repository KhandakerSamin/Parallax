import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mockDisabled } from "@/lib/auth/mock-guard";
import { deleteSession } from "@/lib/auth/mock-store";
import { clearSessionCookie, SESSION_COOKIE } from "@/lib/auth/session-cookie";

export async function POST() {
  const disabled = mockDisabled();
  if (disabled) return disabled;

  const cookieStore = await cookies();
  deleteSession(cookieStore.get(SESSION_COOKIE)?.value);
  const res = new NextResponse(null, { status: 204 });
  clearSessionCookie(res);
  return res;
}
