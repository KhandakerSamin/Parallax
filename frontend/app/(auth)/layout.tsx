import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthScrollArea } from "@/components/auth/AuthScrollArea";
import { BrandPanel } from "@/components/auth/BrandPanel";
import { LogoMark } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/**
 * Split screen: the form column scrolls on its own, while the animated brand panel
 * on the right stays fixed in view (desktop only).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:h-dvh lg:grid-cols-[1fr_1.05fr] lg:overflow-hidden">
      <AuthScrollArea>
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-lg text-sm transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">Back to home</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold lg:hidden"
            aria-label="Parallax home"
          >
            <LogoMark className="size-7" />
            Parallax
          </Link>
          <ThemeToggle />
        </header>
        <main id="main" className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </AuthScrollArea>
      <BrandPanel />
    </div>
  );
}
