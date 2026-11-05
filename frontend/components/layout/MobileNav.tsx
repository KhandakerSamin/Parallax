"use client";

import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_LINKS } from "@/lib/constants/content";
import { cn } from "@/lib/utils";
import { LogoMark } from "./Logo";

type MobileNavProps = {
  active: string | null;
  hrefFor: (id: string) => string;
  signedIn: boolean;
};

/** Hamburger menu for small screens. Radix locks body scroll while it is open. */
export function MobileNav({ active, hrefFor, signedIn }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <SheetTitle className="text-lg font-semibold">Parallax</SheetTitle>
        </div>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>

        <nav aria-label="Mobile" className="mt-10">
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link, i) => (
              <motion.li
                key={link.id}
                initial={{ opacity: 0, x: 24 }}
                animate={open ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.08 + i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <SheetClose asChild>
                  <a
                    href={hrefFor(link.id)}
                    aria-current={active === link.id ? "true" : undefined}
                    className={cn(
                      "block rounded-xl px-3 py-3 text-lg font-medium transition-colors hover:bg-muted",
                      active === link.id ? "text-brand" : "text-foreground",
                    )}
                  >
                    {link.label}
                  </a>
                </SheetClose>
              </motion.li>
            ))}
          </ul>
        </nav>

        <motion.div
          className="mt-auto flex flex-col gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={open ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.35 }}
        >
          {signedIn ? (
            <Button asChild size="lg">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href="/sign-up">Get started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </>
          )}
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
