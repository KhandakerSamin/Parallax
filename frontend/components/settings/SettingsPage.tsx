"use client";

import { Check, KeyRound, Laptop, Link2, Loader2, LogOut, Palette, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { THEME_OPTIONS, useMounted } from "@/components/app/shell/ThemeMenu";
import { ConfirmDialog, ErrorState, PageHeader, Panel, Skeleton } from "@/components/app/ui";
import { GoogleMark } from "@/components/auth/GoogleButton";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  AccountError,
  changePassword,
  describeDevice,
  listSessions,
  revokeOtherSessions,
  updateProfile,
  type AccountSession,
} from "@/lib/account/api";
import { formatDate, relativeTime } from "@/lib/app/format";
import { API_URL, DEPARTMENTS } from "@/lib/auth/config";
import { ROLE_LABELS, idLabel, type User } from "@/lib/auth/types";
import { PASSWORD_RULES } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "security", label: "Security", icon: KeyRound },
  { id: "connected", label: "Connected accounts", icon: Link2 },
  { id: "appearance", label: "Appearance", icon: Palette },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

/** /dashboard/settings: profile, password and sessions, Google, and theme. */
export function SettingsPage() {
  const { user } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const section = (SECTIONS.find((s) => s.id === params.get("section"))?.id ??
    "profile") as SectionId;
  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your profile, sign-in and how Parallax looks." />
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col"
        >
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={section === id ? "page" : undefined}
              onClick={() => router.replace(`${pathname}?section=${id}`, { scroll: false })}
              className={cn(
                "flex h-10 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors",
                section === id
                  ? "bg-semantic-soft text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </nav>
        <div className="max-w-3xl min-w-0 space-y-6">
          {section === "profile" && <ProfileSection user={user} />}
          {section === "security" && <SecuritySection user={user} />}
          {section === "connected" && <ConnectedSection user={user} />}
          {section === "appearance" && <AppearanceSection />}
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ user }: { user: User }) {
  const { setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [department, setDepartment] = useState(user.department);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = name.trim() !== user.name || department !== user.department;
  const nameValid = name.trim().length >= 2 && name.trim().length <= 80;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!nameValid) return setError("Use 2 to 80 characters.");
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile({ name: name.trim(), department });
      setUser(updated);
      toast.success("Profile saved");
    } catch (err) {
      setError(err instanceof AccountError ? err.message : "The profile wasn't saved.");
    } finally {
      setSaving(false);
    }
  }

  const readOnly = [
    ["Email", user.email],
    [idLabel(user.role), user.universityId],
    ["Role", ROLE_LABELS[user.role]],
  ];

  return (
    <Panel title="Profile" description="Your name and department appear on your reports.">
      <form onSubmit={save} className="space-y-5">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={user.name}
            src={user.avatarUrl}
            className="size-16"
            fallbackClassName="text-lg"
          />
          <p className="text-muted-foreground text-sm">
            {user.avatarUrl
              ? "Your photo comes from your Google account."
              : "Your initials are shown; link Google to use your Google photo."}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium">
              Full name
            </label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              aria-invalid={!nameValid || undefined}
            />
          </div>
          <div>
            <label htmlFor="profile-department" className="mb-1.5 block text-sm font-medium">
              Department
            </label>
            <Select
              id="profile-department"
              value={department}
              onValueChange={setDepartment}
              options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
              className="w-full"
            />
          </div>
        </div>
        <dl className="border-border grid gap-3 rounded-2xl border p-4 text-sm sm:grid-cols-3">
          {readOnly.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="mt-0.5 truncate font-medium">{value}</dd>
            </div>
          ))}
          <p className="text-muted-foreground text-xs sm:col-span-3">
            Email and ID can&apos;t be changed. Ask an administrator to change your role.
          </p>
        </dl>
        {error && (
          <p role="alert" className="text-danger text-sm font-medium">
            {error}
          </p>
        )}
        <Button type="submit" disabled={!changed || saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden />}
          Save profile
        </Button>
      </form>
    </Panel>
  );
}

function SecuritySection({ user }: { user: User }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    current?: string;
    next?: string;
    confirm?: string;
    form?: string;
  }>({});
  const [sessions, setSessions] = useState<
    | { status: "loading" }
    | { status: "error"; message: string; code: number }
    | { status: "ready"; list: AccountSession[] }
  >({ status: "loading" });
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const googleOnly = user.hasPassword === false;

  const fetchSessions = useCallback(() => {
    listSessions()
      .then((list) => setSessions({ status: "ready", list }))
      .catch((err) =>
        setSessions({
          status: "error",
          message: err instanceof AccountError ? err.message : "Couldn't load your sessions.",
          code: err instanceof AccountError ? err.status : 0,
        }),
      );
  }, []);
  useEffect(fetchSessions, [fetchSessions]);
  const loadSessions = () => {
    setSessions({ status: "loading" });
    fetchSessions();
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problems: typeof errors = {};
    if (!current) problems.current = "Enter your current password.";
    const missing = PASSWORD_RULES.filter((r) => !r.test(next));
    if (missing.length)
      problems.next = `Needs ${missing.map((r) => r.label.toLowerCase()).join(", ")}.`;
    if (next !== confirm) problems.confirm = "The passwords don't match.";
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setSaving(true);
    try {
      const revoked = await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password changed", {
        description: revoked
          ? `${revoked} other session${revoked === 1 ? "" : "s"} signed out.`
          : "No other sessions were signed in.",
      });
      loadSessions();
    } catch (err) {
      if (err instanceof AccountError && err.field === "currentPassword")
        setErrors({ current: err.message });
      else if (err instanceof AccountError && err.field === "newPassword")
        setErrors({ next: err.message });
      else
        setErrors({
          form: err instanceof AccountError ? err.message : "The password wasn't changed.",
        });
    } finally {
      setSaving(false);
    }
  }

  async function revokeOthers() {
    setRevoking(true);
    try {
      const n = await revokeOtherSessions();
      toast.success(
        n
          ? `Signed out of ${n} other session${n === 1 ? "" : "s"}`
          : "No other sessions were signed in",
      );
      setRevokeOpen(false);
      loadSessions();
    } catch (err) {
      toast.error(
        err instanceof AccountError ? err.message : "Couldn't sign out the other sessions.",
      );
    } finally {
      setRevoking(false);
    }
  }

  const others = sessions.status === "ready" ? sessions.list.filter((s) => !s.current).length : 0;

  return (
    <>
      <Panel
        title="Change password"
        description="Every other browser signed in to your account is signed out when it changes."
      >
        {googleOnly ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <GoogleMark className="size-4" />
            You sign in with Google, so there is no Parallax password to change.
          </p>
        ) : (
          <form onSubmit={submit} className="max-w-md space-y-4" noValidate>
            <Field id="current-password" label="Current password" error={errors.current}>
              <PasswordInput
                id="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                aria-invalid={!!errors.current || undefined}
              />
            </Field>
            <Field id="new-password" label="New password" error={errors.next}>
              <PasswordInput
                id="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                aria-invalid={!!errors.next || undefined}
              />
              <div className="mt-2">
                <PasswordStrength password={next} id="new-password-strength" />
              </div>
            </Field>
            <Field id="confirm-password" label="Confirm new password" error={errors.confirm}>
              <PasswordInput
                id="confirm-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                aria-invalid={!!errors.confirm || undefined}
              />
            </Field>
            {errors.form && (
              <p role="alert" className="text-danger text-sm font-medium">
                {errors.form}
              </p>
            )}
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" aria-hidden />}
              Change password
            </Button>
          </form>
        )}
      </Panel>

      <Panel
        title="Active sessions"
        description="Browsers signed in to your account."
        action={
          others > 0 && (
            <Button variant="outline" size="sm" onClick={() => setRevokeOpen(true)}>
              <LogOut aria-hidden />
              Sign out of all other sessions
            </Button>
          )
        }
      >
        {sessions.status === "loading" && (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}
        {sessions.status === "error" && (
          <ErrorState message={sessions.message} status={sessions.code} onRetry={loadSessions} />
        )}
        {sessions.status === "ready" && (
          <ul className="divide-border divide-y">
            {sessions.list.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-xl">
                  <Laptop className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {describeDevice(s.userAgent)}
                    {s.current && <Badge variant="accent">This device</Badge>}
                  </p>
                  <p className="text-muted-foreground text-xs" title={formatDate(s.lastSeenAt)}>
                    Last seen {relativeTime(s.lastSeenAt)} · signed in{" "}
                    {formatDate(s.createdAt, false)}
                    {s.remember ? " · remembered for 30 days" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        icon={LogOut}
        tone="danger"
        title="Sign out of all other sessions?"
        description="Every other browser signed in to your account is signed out now. This browser stays signed in."
        confirmLabel="Sign them out"
        pending={revoking}
        onConfirm={revokeOthers}
      />
    </>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-danger mt-1.5 text-xs font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

function ConnectedSection({ user }: { user: User }) {
  return (
    <Panel
      title="Connected accounts"
      description="Sign in to Parallax with your DIU Google account."
    >
      <div className="border-border flex flex-wrap items-center gap-4 rounded-2xl border p-4">
        <span className="bg-muted grid size-11 place-items-center rounded-xl">
          <GoogleMark className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Google</p>
          <p className="text-muted-foreground truncate text-sm">
            {user.googleLinked ? `Linked to ${user.email}` : "Not linked"}
          </p>
        </div>
        {user.googleLinked ? (
          <span className="text-success inline-flex items-center gap-1.5 text-sm font-medium">
            <Check className="size-4" aria-hidden />
            Linked
          </span>
        ) : (
          <Button asChild variant="outline">
            <a
              href={`${API_URL}/auth/google?next=${encodeURIComponent("/dashboard/settings?section=connected")}`}
            >
              <GoogleMark />
              Link Google account
            </a>
          </Button>
        )}
      </div>
      {!user.googleLinked && (
        <p className="text-muted-foreground mt-3 text-xs">
          Choose the Google account for {user.email}. It links automatically because the email
          matches.
        </p>
      )}
    </Panel>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <Panel
      title="Appearance"
      description="Light, dark, or follow your device. Remembered in this browser."
    >
      <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                active
                  ? "border-primary/50 bg-semantic-soft/50 ring-primary/20 ring-2"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground mt-4 text-xs">
        Animations follow your device&apos;s reduced-motion setting automatically.
      </p>
    </Panel>
  );
}
