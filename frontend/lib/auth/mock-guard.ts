import { NextResponse } from "next/server";
import { USE_MOCK_AUTH } from "./config";

/** Mock endpoints only exist while NEXT_PUBLIC_USE_MOCK_AUTH is on. */
export function mockDisabled(): NextResponse | null {
  return USE_MOCK_AUTH ? null : NextResponse.json({ message: "Not found" }, { status: 404 });
}

/** Small artificial latency so loading states are visible in demos. */
export function delay(ms = 450): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
