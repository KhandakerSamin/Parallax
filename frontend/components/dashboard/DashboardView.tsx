"use client";

import { motion } from "framer-motion";
import { Building2, FileUp, History, IdCard, LogOut, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GoogleMark } from "@/components/auth/GoogleButton";
import { SignOutDialog } from "@/components/auth/SignOutDialog";
import { useAuth } from "@/components/providers/AuthProvider";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, idLabel } from "@/lib/auth/types";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Protected placeholder dashboard: who you are, and what's coming next. */
export function DashboardView() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // The proxy only checks that a cookie exists; if the session turns out to be invalid on
  // first load, go to sign-in. A deliberate sign-out is navigated by AuthProvider instead.
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (status === "authenticated") wasSignedIn.current = true;
    if (status === "unauthenticated" && !wasSignedIn.current)
      router.replace("/sign-in?next=/dashboard");
  }, [status, router]);

  if (!user) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading your dashboard">
        <div className="bg-muted h-36 animate-pulse rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-muted h-44 animate-pulse rounded-3xl" />
          <div className="bg-muted h-44 animate-pulse rounded-3xl" />
        </div>
      </div>
    );
  }

  const details = [
    { icon: Mail, label: "Email", value: user.email },
    { icon: IdCard, label: idLabel(user.role), value: user.universityId },
    { icon: Building2, label: "Department", value: user.department },
  ];

  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        aria-labelledby="dash-title"
        className="border-border bg-card shadow-soft relative overflow-hidden rounded-3xl border p-6 sm:p-8"
      >
        <div
          aria-hidden
          className="absolute -top-20 -right-16 size-64 rounded-full bg-[#4f46e5] opacity-15 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={user.name}
              src={user.avatarUrl}
              className="ring-background size-16 shadow-md ring-4"
              fallbackClassName="text-lg"
            />
            <div>
              <h1 id="dash-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Hello, {user.name.split(" ")[0]}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="brand">{ROLE_LABELS[user.role]}</Badge>
                <span className="text-muted-foreground text-sm">{user.name}</span>
                {user.googleLinked && (
                  <span className="text-muted-foreground border-border inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
                    <GoogleMark className="size-3" />
                    Google account
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            <LogOut aria-hidden />
            Sign out
          </Button>
        </div>
        <dl className="border-border relative mt-8 grid gap-4 border-t pt-6 sm:grid-cols-3">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="min-w-0">
              <dt className="text-muted-foreground flex items-center gap-2 text-xs">
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </dt>
              <dd className="mt-1 truncate pl-6 text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </motion.section>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
          className="border-border bg-card rounded-3xl border p-6 sm:p-8"
        >
          <span className="bg-semantic-soft text-brand grid size-11 place-items-center rounded-xl">
            <FileUp className="size-5" aria-hidden />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Analyze a document</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Upload a proposal or report and Parallax will search the DIU corpus for similar work.
          </p>
          <Button asChild className="mt-5">
            <Link href="/dashboard/analyze">
              <FileUp aria-hidden />
              Start an analysis
            </Link>
          </Button>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease: EASE }}
          className="border-border bg-card rounded-3xl border p-6 sm:p-8"
        >
          <span className="bg-concept-soft text-concept grid size-11 place-items-center rounded-xl">
            <History className="size-5" aria-hidden />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Recent reports</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            No reports yet. Your similarity reports will appear here.
          </p>
        </motion.section>
      </div>

      <p className="text-muted-foreground flex items-center gap-2 px-1 pt-2 text-xs">
        <ShieldCheck className="text-accent size-3.5" aria-hidden />
        Results show potential similarity, never a verdict. Reviewers make the final call.
      </p>

      <SignOutDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </div>
  );
}
