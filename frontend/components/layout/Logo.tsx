import Link from "next/link";
import { cn } from "@/lib/utils";

/** Brand mark: four offset planes, one per perspective — one document seen from four angles. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect x="2" y="9" width="17" height="17" rx="4.5" fill="var(--lexical)" opacity="0.9" />
      <rect x="6" y="6" width="17" height="17" rx="4.5" fill="var(--structural)" opacity="0.9" />
      <rect x="10" y="3" width="17" height="17" rx="4.5" fill="var(--concept)" opacity="0.92" />
      <rect x="13" y="12" width="17" height="17" rx="4.5" fill="#4f46e5" />
      <path d="M17.5 20.5h8M17.5 24h5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg font-semibold tracking-tight",
        className,
      )}
      aria-label="Parallax home"
    >
      <LogoMark />
      <span className="text-lg">Parallax</span>
    </Link>
  );
}
