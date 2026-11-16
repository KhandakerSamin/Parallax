"use client";

import { motion } from "framer-motion";
import { ArrowLeft, FileText, Gavel, Search, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { useAuth } from "@/components/providers/AuthProvider";
import { Input } from "@/components/ui/input";
import {
  AdminError,
  getStats,
  listUsers,
  updateUser,
  type AdminStats,
  type AdminUser,
} from "@/lib/admin/api";
import { ROLE_LABELS, ROLES, isAdmin, type Role } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

function StatTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <Icon className="size-4" aria-hidden />
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-0.5 truncate text-xs">{detail}</p>
    </div>
  );
}

function UserRow({
  person,
  me,
  canGrantAdmin,
  onSaved,
}: {
  person: AdminUser;
  me: boolean;
  canGrantAdmin: boolean;
  onSaved: (user: AdminUser) => void;
}) {
  const [busy, setBusy] = useState(false);
  const elevated = person.role === "admin" || person.role === "super_admin";
  const locked = me || (elevated && !canGrantAdmin);
  const roles = ROLES.filter((r) => canGrantAdmin || (r !== "admin" && r !== "super_admin"));

  async function change(update: { role?: Role; isActive?: boolean }, message: string) {
    setBusy(true);
    try {
      onSaved(await updateUser(person.id, update));
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : "Couldn't save the change.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className={cn(
        "border-border flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center",
        !person.isActive && "opacity-60",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar name={person.name} className="size-9" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {person.name}
            {me && <span className="text-muted-foreground font-normal"> (you)</span>}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {person.email} · <span className="font-mono">{person.universityId}</span> ·{" "}
            {person.reportCount} report
            {person.reportCount === 1 ? "" : "s"}
            {person.googleLinked && " · Google"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {locked ? (
          <span className="bg-muted rounded-lg px-2.5 py-1.5 text-sm">
            {ROLE_LABELS[person.role]}
          </span>
        ) : (
          <select
            aria-label={`Role for ${person.name}`}
            value={person.role}
            disabled={busy}
            onChange={(e) =>
              change(
                { role: e.target.value as Role },
                `${person.name} is now ${ROLE_LABELS[e.target.value as Role]}`,
              )
            }
            className="border-input bg-background focus-visible:ring-ring rounded-lg border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        )}
        {!locked && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              change(
                { isActive: !person.isActive },
                person.isActive
                  ? `${person.name} was deactivated`
                  : `${person.name} was reactivated`,
              )
            }
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors",
              person.isActive
                ? "border-danger/30 text-danger hover:bg-danger/5"
                : "border-accent/30 text-accent hover:bg-accent-soft",
            )}
          >
            {person.isActive ? "Deactivate" : "Reactivate"}
          </button>
        )}
      </div>
    </li>
  );
}

/** /dashboard/admin: system overview and account management, for admins. */
export function AdminView() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && !isAdmin(user?.role)) router.replace("/dashboard");
  }, [status, user, router]);

  useEffect(() => {
    if (!isAdmin(user?.role)) return;
    getStats()
      .then(setStats)
      .catch((err) =>
        setError(err instanceof AdminError ? err.message : "Couldn't load the overview."),
      );
  }, [user]);

  useEffect(() => {
    if (!isAdmin(user?.role)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      listUsers({ q: query, role: role === "all" ? undefined : role })
        .then((body) => {
          if (cancelled) return;
          setUsers(body.users);
          setTotal(body.total);
        })
        .catch(
          (err) =>
            !cancelled &&
            setError(err instanceof AdminError ? err.message : "Couldn't load users."),
        );
    }, 250); // wait for typing to pause
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, role, user]);

  const saved = (updated: AdminUser) => {
    setUsers((list) => list?.map((u) => (u.id === updated.id ? updated : u)) ?? null);
    getStats()
      .then(setStats)
      .catch(() => undefined);
  };

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Dashboard
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Administration</h1>
          <p className="text-muted-foreground mt-1">People, roles and an overview of Parallax.</p>
        </div>

        {error && (
          <p
            role="alert"
            className="border-danger/30 bg-danger/5 rounded-xl border px-3.5 py-3 text-sm"
          >
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats ? (
            <>
              <StatTile
                icon={Users}
                label="People"
                value={stats.users}
                detail={`${stats.activeUsers} active · ${stats.usersByRole.student} students`}
              />
              <StatTile
                icon={ShieldCheck}
                label="Reviewers & admins"
                value={
                  stats.usersByRole.reviewer +
                  stats.usersByRole.admin +
                  stats.usersByRole.super_admin
                }
                detail={`${stats.usersByRole.reviewer} reviewers`}
              />
              <StatTile
                icon={FileText}
                label="Reports"
                value={stats.reports}
                detail={`${stats.reportsByLevel.high} high · ${stats.reportsByLevel.moderate} moderate`}
              />
              <StatTile
                icon={Gavel}
                label="Awaiting review"
                value={stats.reviewsByStatus.pending}
                detail={`${stats.reviewsByStatus.follow_up} need follow-up`}
              />
            </>
          ) : (
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-muted h-24 animate-pulse rounded-2xl" />
            ))
          )}
        </div>

        <section
          className="border-border bg-card shadow-soft rounded-3xl border p-6 sm:p-8"
          aria-labelledby="people"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="people" className="text-lg font-semibold">
              People{" "}
              {users && (
                <span className="text-muted-foreground text-sm font-normal">({total})</span>
              )}
            </h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, email or ID"
                  aria-label="Search people"
                  className="w-48 pl-9 sm:w-60"
                />
              </div>
              <select
                aria-label="Filter by role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role | "all")}
                className="border-input bg-background focus-visible:ring-ring rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2"
              >
                <option value="all">All roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ul className="mt-5 space-y-2">
            {users === null
              ? [0, 1, 2].map((i) => (
                  <li key={i} className="bg-muted h-16 animate-pulse rounded-xl" />
                ))
              : users.map((person) => (
                  <UserRow
                    key={person.id}
                    person={person}
                    me={person.id === user?.id}
                    canGrantAdmin={user?.role === "super_admin"}
                    onSaved={saved}
                  />
                ))}
            {users?.length === 0 && (
              <li className="text-muted-foreground py-6 text-center text-sm">No one matches.</li>
            )}
          </ul>
          <p className="text-muted-foreground mt-4 text-xs">
            Admins can make anyone a student, reviewer or researcher. Only a super admin can grant
            admin rights. Deactivated accounts are signed out at once and can&apos;t sign in.
          </p>
        </section>
      </motion.div>
    </div>
  );
}
