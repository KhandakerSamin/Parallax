import type { NextResponse } from "next/server";

/** Name of the httpOnly session cookie (shared by the mock handlers and proxy.ts). */
export const SESSION_COOKIE = process.env.AUTH_COOKIE_NAME ?? "parallax_session";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function setSessionCookie(res: NextResponse, token: string, remember: boolean): void {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Without "remember me" it is a session cookie that ends when the browser closes.
    ...(remember ? { maxAge: THIRTY_DAYS } : {}),
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({ name: SESSION_COOKIE, value: "", httpOnly: true, path: "/", maxAge: 0 });
}
