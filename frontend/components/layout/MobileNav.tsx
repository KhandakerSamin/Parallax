"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NAV_LINKS } from "@/lib/constants/content";
import { cn } from "@/lib/utils";
import { LogoMark } from "./Logo";

type MobileNavProps = {
  active: string | null;
  hrefFor: (id: string) => string;
  signedIn: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;

/** Hamburger menu for small screens: a centered modal with staggered links. */
export function MobileNav({ active, hrefFor, signedIn }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="size-5" aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel="Close menu" className="overflow-hidden p-0">
        {/* Soft brand glow behind the header */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_22%,transparent),transparent)]"
        />

        <div className="relative flex items-center gap-2.5 px-6 pt-6">
          <LogoMark />
          <DialogTitle className="text-lg font-semibold">Parallax</DialogTitle>
        </div>
        <DialogDescription className="text-muted-foreground relative px-6 pt-1 text-sm">
          Jump to a section
        </DialogDescription>

        <nav aria-label="Mobile" className="relative mt-5 px-3">
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link, i) => {
              const isActive = active === link.id;
              return (
                <motion.li
                  key={link.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 + i * 0.05, duration: 0.4, ease: EASE }}
                >
                  <DialogClose asChild>
                    <a
                      href={hrefFor(link.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "group flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors",
                        isActive ? "bg-muted text-brand" : "text-foreground hover:bg-muted/70",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "font-mono text-xs tabular-nums",
                          isActive ? "text-brand" : "text-muted-foreground",
                        )}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-lg font-medium">{link.label}</span>
                      <ArrowUpRight
                        aria-hidden
                        className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </a>
                  </DialogClose>
                </motion.li>
              );
            })}
          </ul>
        </nav>

        <motion.div
          className="border-border bg-muted/40 relative mt-4 grid gap-3 border-t p-6 sm:grid-cols-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.4, ease: EASE }}
        >
          {signedIn ? (
            <Button asChild size="lg" className="sm:col-span-2">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="outline" size="lg">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
