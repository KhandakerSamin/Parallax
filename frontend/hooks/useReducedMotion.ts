"use client";

import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

/** True when the user asked the OS to minimise motion. */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}
