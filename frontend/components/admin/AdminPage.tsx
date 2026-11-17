"use client";

import {
  FileStack,
  Hourglass,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Skeleton,
  StatTile,
} from "@/components/app/ui";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AdminError, getStats, listUsers, updateUser, type AdminUser } from "@/lib/admin/api";
import { formatDate, relativeTime } from "@/lib/app/format";
import { useLoad } from "@/lib/app/useLoad";
import { ROLE_LABELS, ROLES, isAdmin, type Role } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

const ELEVATED: Role[] = ["admin", "super_admin"];

type Pending =
  | { kind: "role"; person: AdminUser; role: Role }
  | { kind: "status"; person: AdminUser; active: boolean };

/** /dashboard/admin: usage numbers, people, roles and account status (admins only). */
export function AdminPage() {
  const { user } = useAuth();
  const stats = useLoad(getStats, "Couldn't load the numbers.");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [people, setPeople] = useState<
    | { status: "loading" }
    | { status: "error"; message: string; code: number }
    | { status: "ready"; users: AdminUser[] }
  >({ status: "loading" });
  const [pending, setPending] = useState<Pending | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPeople = useCallback(() => {
    setPeople({ status: "loading" });
    listUsers({ q, role: roleFilter || undefined })
      .then(({ users }) => setPeople({ status: "ready", users }))
      .catch((err) =>
        setPeople({
          status: "error",
          message: err instanceof AdminError ? err.message : "Couldn't load people.",
          code: err instanceof AdminError ? err.status : 0,
        }),
      );
  }, [q, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(loadPeople, 250);
    return () => clearTimeout(timer);
  }, [loadPeople]);

  const shown = useMemo(() => {
    if (people.status !== "ready") return [];
    return people.users.filter(
      (p) => !statusFilter || (statusFilter === "active" ? p.isActive : !p.isActive),
    );
  }, [people, statusFilter]);

  if (user && !isAdmin(user.role)) {
    return (
      <EmptyState
        art={false}
        title="Administration is for admins"
        body="Ask an administrator if you need access."
        action={<ShieldAlert className="text-muted-foreground size-6" aria-hidden />}
      />
    );
  }
  if (!user) return null;
  const superAdmin = user.role === "super_admin";

  /** The roles this admin may choose for this person (the API enforces the same rule). */
  function roleOptions(person: AdminUser): Role[] {
    if (superAdmin) return [...ROLES];
    if (ELEVATED.includes(person.role)) return [person.role];
    return ROLES.filter((r) => !ELEVATED.includes(r));
  }

  async function confirm() {
    if (!pending) return;
    setSaving(true);
    try {
      const change =
        pending.kind === "role" ? { role: pending.role } : { isActive: pending.active };
      const updated = await updateUser(pending.person.id, change);
      setPeople((p) =>
        p.status === "ready"
          ? { status: "ready", users: p.users.map((u) => (u.id === updated.id ? updated : u)) }
          : p,
      );
      toast.success(
        pending.kind === "role"
          ? `${updated.name} is now ${ROLE_LABELS[updated.role]}`
          : updated.isActive
            ? `${updated.name} can sign in again`
            : `${updated.name} was deactivated and signed out`,
      );
      stats.reload();
      setPending(null);
    } catch (err) {
      toast.error(err instanceof AdminError ? err.message : "The change wasn't saved.");
    } finally {
      setSaving(false);
    }
  }

  const s = stats.state.status === "ready" ? stats.state.data : null;
  const loadingStats = stats.state.status === "loading";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        description="Usage numbers, people, roles and account status."
      />
      {stats.state.status === "error" ? (
        <Panel>
          <ErrorState
            message={stats.state.message}
            status={stats.state.code}
            onRetry={stats.reload}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="People"
            icon={Users}
            loading={loadingStats}
            value={s?.users ?? 0}
            hint={s ? `${s.activeUsers} active` : undefined}
          />
          <StatTile
            label="Reviewers & admins"
            icon={ShieldCheck}
            loading={loadingStats}
            value={s ? s.usersByRole.reviewer + s.usersByRole.admin + s.usersByRole.super_admin : 0}
          />
          <StatTile
            label="Reports"
            icon={FileStack}
            loading={loadingStats}
            value={s?.reports ?? 0}
            hint={
              s
                ? `${s.reportsByLevel.high} high · ${s.reportsByLevel.moderate} moderate`
                : undefined
            }
          />
          <StatTile
            label="Awaiting review"
            icon={Hourglass}
            loading={loadingStats}
            value={s?.reviewsByStatus.pending ?? 0}
            href="/dashboard/reviews"
          />
        </div>
      )}

      <Panel
        title="People"
        description={
          superAdmin
            ? "You can change any role, including admins."
            : "Only a super admin can make or change an admin."
        }
      >
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email or ID"
              aria-label="Search people"
              className="pl-9"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "")}
            aria-label="Filter by role"
            className="border-input bg-card h-11 rounded-xl border px-3 text-sm"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            aria-label="Filter by status"
            className="border-input bg-card h-11 rounded-xl border px-3 text-sm"
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </select>
        </div>

        {people.status === "loading" && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading people">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}
        {people.status === "error" && (
          <ErrorState message={people.message} status={people.code} onRetry={loadPeople} />
        )}
        {people.status === "ready" && shown.length === 0 && (
          <EmptyState art={false} title="No one matches" />
        )}
        {shown.length > 0 && (
          <ul className="divide-border divide-y">
            {shown.map((person) => {
              const self = person.id === user.id;
              const options = roleOptions(person);
              const locked = self || options.length < 2;
              const canToggle = !self && (superAdmin || !ELEVATED.includes(person.role));
              const lockReason = self
                ? "You can't change your own account."
                : "Only a super admin can change an admin.";
              return (
                <li
                  key={person.id}
                  className="grid items-center gap-3 py-3.5 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_auto_auto]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      name={person.name}
                      className={cn("size-10 shrink-0", !person.isActive && "opacity-50")}
                    />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-medium">
                        {person.name}
                        {self && (
                          <span className="text-muted-foreground text-xs font-normal">(you)</span>
                        )}
                      </p>
                      <p className="text-muted-foreground truncate text-sm">{person.email}</p>
                    </div>
                  </div>
                  <div className="text-muted-foreground min-w-0 text-sm">
                    <p className="truncate">
                      <span className="font-mono text-xs">{person.universityId}</span> ·{" "}
                      {person.department}
                    </p>
                    <p
                      className="text-xs"
                      title={person.lastLoginAt ? formatDate(person.lastLoginAt) : undefined}
                    >
                      {person.lastLoginAt
                        ? `Last active ${relativeTime(person.lastLoginAt)}`
                        : "Never signed in"}{" "}
                      · {person.reportCount} report{person.reportCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        person.isActive
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {person.isActive ? "Active" : "Deactivated"}
                    </span>
                    <Locked locked={locked} reason={lockReason}>
                      <select
                        value={person.role}
                        disabled={locked}
                        onChange={(e) =>
                          setPending({ kind: "role", person, role: e.target.value as Role })
                        }
                        aria-label={`Role for ${person.name}`}
                        className="border-input bg-card h-9 rounded-lg border px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {(options.includes(person.role) ? options : [person.role, ...options]).map(
                          (r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ),
                        )}
                      </select>
                    </Locked>
                  </div>
                  <div className="md:text-right">
                    <Locked locked={!canToggle} reason={lockReason}>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canToggle}
                        onClick={() =>
                          setPending({ kind: "status", person, active: !person.isActive })
                        }
                        className={person.isActive ? "text-danger hover:bg-danger/10" : undefined}
                      >
                        {person.isActive ? <UserX aria-hidden /> : <UserCheck aria-hidden />}
                        {person.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                    </Locked>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        tone={pending?.kind === "status" && !pending.active ? "danger" : "default"}
        icon={pending?.kind === "status" ? (pending.active ? UserCheck : UserX) : ShieldCheck}
        title={
          pending?.kind === "role"
            ? `Change ${pending.person.name} from ${ROLE_LABELS[pending.person.role]} to ${ROLE_LABELS[pending.role]}?`
            : pending?.active
              ? `Reactivate ${pending.person.name}?`
              : `Deactivate ${pending?.person.name ?? ""}?`
        }
        description={
          pending?.kind === "role"
            ? "Their access changes the next time a page loads."
            : pending?.active
              ? "They can sign in again with their existing password or Google account."
              : "They'll be signed out immediately and can't sign in until reactivated. Their reports are kept."
        }
        confirmLabel={
          pending?.kind === "role" ? "Change role" : pending?.active ? "Reactivate" : "Deactivate"
        }
        pending={saving}
        onConfirm={confirm}
      />
    </div>
  );
}

function Locked({
  locked,
  reason,
  children,
}: {
  locked: boolean;
  reason: string;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{children}</span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
