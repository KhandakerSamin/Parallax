"use client";

import { motion } from "framer-motion";
import { Building2, FileUp, History, IdCard, LogOut, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SignOutDialog } from "@/components/auth/SignOutDialog";
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/auth/types";
import { initials } from "@/lib/utils";

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
    if (status === "unauthenticated" && !wasSignedIn.current) router.replace("/sign-in?next=/dashboard");
  }, [status, router]);

  if (!user) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading your dashboard">
        <div className="h-36 animate-pulse rounded-3xl bg-muted" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-3xl bg-muted" />
          <div className="h-44 animate-pulse rounded-3xl bg-muted" />
        </div>
      </div>
    );
  }

  const details = [
    { icon: Mail, label: "Email", value: user.email },
    { icon: IdCard, label: "Student / Staff ID", value: user.universityId },
    { icon: Building2, label: "Department", value: user.department },
  ];

  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        aria-labelledby="dash-title"
        className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8"
      >
        <div aria-hidden className="absolute -top-20 -right-16 size-64 rounded-full bg-[#4f46e5] opacity-15 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="text-base">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 id="dash-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Hello, {user.name.split(" ")[0]}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="brand">{ROLE_LABELS[user.role]}</Badge>
                <span className="text-sm text-muted-foreground">{user.name}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            <LogOut aria-hidden />
            Sign out
          </Button>
        </div>
        <dl className="relative mt-8 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="min-w-0">
              <dt className="flex items-center gap-2 text-xs text-muted-foreground">
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
          className="rounded-3xl border border-dashed border-input bg-card/60 p-6 sm:p-8"
        >
          <span className="grid size-11 place-items-center rounded-xl bg-semantic-soft text-brand">
            <FileUp className="size-5" aria-hidden />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Analyze a document</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Upload a proposal or report and Parallax will search the DIU corpus for similar work.
          </p>
          <Badge className="mt-5">Coming soon</Badge>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease: EASE }}
          className="rounded-3xl border border-border bg-card p-6 sm:p-8"
        >
          <span className="grid size-11 place-items-center rounded-xl bg-concept-soft text-concept">
            <History className="size-5" aria-hidden />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Recent reports</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            No reports yet. Your similarity reports will appear here.
          </p>
        </motion.section>
      </div>

      <p className="flex items-center gap-2 px-1 pt-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-accent" aria-hidden />
        Results show potential similarity, never a verdict. Reviewers make the final call.
      </p>

      <SignOutDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </div>
  );
}
