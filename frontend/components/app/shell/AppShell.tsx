"use client";

import { ChevronRight, Menu, PanelLeftClose, PanelLeftOpen, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FooterNote, Skeleton } from "@/components/app/ui";
import { SkipLink } from "@/components/layout/SkipLink";
import { LogoMark } from "@/components/layout/Logo";
import { useAuth } from "@/components/providers/AuthProvider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { listReviewQueue } from "@/lib/analysis/api";
import { isReviewer, type User } from "@/lib/auth/types";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";
import { crumbsFor, isActive, navFor } from "./nav";
import { ShellContext } from "./ShellContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const COLLAPSE_KEY = "parallax:sidebar-collapsed";

/** The gradient the "New analysis" button shares with the homepage's call to action. */
const CTA_GRADIENT =
  "bg-[linear-gradient(110deg,var(--primary)_0%,#6366f1_45%,var(--concept)_100%)] text-white shadow-[0_8px_24px_-10px_rgb(79_70_229/0.7)] hover:brightness-110";

/**
 * The signed-in app frame: a sidebar (264 px; a 72 px icon rail below 1280 px or when
 * collapsed; a drawer below 768 px), a sticky top bar with breadcrumbs, and the page.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // The sidebar is only drawn after the user loads (client-side), so reading storage here is safe.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  // The drawer stays open only on the page it was opened from, so navigating closes it.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);

  function toggleCollapsed() {
    setCollapsed((was) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, was ? "0" : "1");
      } catch {
        // Not remembered, but still toggles.
      }
      return !was;
    });
  }

  // A session that ended (expired, or signed out elsewhere) goes back to sign-in.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  const reviewer = user ? isReviewer(user.role) : false;
  const refreshReviewCount = useCallback(() => {
    if (!reviewer) return;
    listReviewQueue({ status: "pending", limit: 200 })
      .then((reports) => setReviewCount(reports.length))
      .catch(() => setReviewCount(null));
  }, [reviewer]);

  useEffect(() => {
    refreshReviewCount();
  }, [refreshReviewCount, pathname]);

  const shell = useMemo(
    () => ({ setPageTitle, reviewCount, refreshReviewCount }),
    [reviewCount, refreshReviewCount],
  );

  if (!user) {
    return <ShellSkeleton />;
  }

  const crumbs = crumbsFor(pathname);
  return (
    <ShellContext.Provider value={shell}>
      <TooltipProvider delayDuration={200}>
        <SkipLink />
        <div className="bg-background min-h-dvh">
          {/* Sidebar: icon rail from md, full width from xl unless collapsed. */}
          <aside
            data-app-chrome
            className={cn(
              "border-border bg-card/60 fixed inset-y-0 left-0 z-40 hidden flex-col border-r backdrop-blur-xl transition-[width] duration-200 ease-out md:flex",
              collapsed ? "w-[72px]" : "w-[72px] xl:w-[264px]",
            )}
          >
            <SidebarBody
              user={user}
              pathname={pathname}
              reviewCount={reviewCount}
              rail={collapsed ? "always" : "below-xl"}
              onToggle={toggleCollapsed}
              collapsed={collapsed}
            />
          </aside>

          {/* Mobile drawer. */}
          <DialogPrimitive.Root
            open={drawerPath === pathname}
            onOpenChange={(open) => setDrawerPath(open ? pathname : null)}
          >
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0b0f1a]/55 backdrop-blur-sm data-[state=closed]:animate-[fade-out_150ms_ease-in] data-[state=open]:animate-[fade-in_200ms_ease-out] md:hidden" />
              <DialogPrimitive.Content className="bg-card border-border fixed inset-y-0 left-0 z-50 flex w-[min(300px,86vw)] flex-col border-r shadow-2xl outline-none data-[state=open]:animate-[fade-in_200ms_ease-out] md:hidden">
                <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
                <DialogPrimitive.Close
                  className="text-muted-foreground hover:bg-muted absolute top-4 right-3 grid size-9 cursor-pointer place-items-center rounded-full"
                  aria-label="Close navigation"
                >
                  <X className="size-5" aria-hidden />
                </DialogPrimitive.Close>
                <SidebarBody
                  user={user}
                  pathname={pathname}
                  reviewCount={reviewCount}
                  rail="never"
                />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>

          <div
            data-app-main
            className={cn(
              "flex min-h-dvh flex-col transition-[padding] duration-200 ease-out",
              collapsed ? "md:pl-[72px]" : "md:pl-[72px] xl:pl-[264px]",
            )}
          >
            <header
              data-app-chrome
              className="glass border-border sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 sm:px-6 lg:px-8"
            >
              <button
                type="button"
                onClick={() => setDrawerPath(pathname)}
                className="text-muted-foreground hover:bg-muted -ml-1 grid size-9 cursor-pointer place-items-center rounded-full md:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" aria-hidden />
              </button>
              <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
                <ol className="flex min-w-0 items-center gap-1.5 text-sm">
                  {crumbs.map((crumb, i) => {
                    const last = i === crumbs.length - 1 && !pageTitle;
                    return (
                      <li key={crumb.href} className="flex min-w-0 items-center gap-1.5">
                        {last ? (
                          <span aria-current="page" className="truncate font-medium">
                            {crumb.label}
                          </span>
                        ) : (
                          <Link
                            href={crumb.href}
                            className="text-muted-foreground hover:text-foreground truncate"
                          >
                            {crumb.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                  {pageTitle && (
                    <li className="flex min-w-0 items-center gap-1.5">
                      <ChevronRight
                        className="text-muted-foreground size-3.5 shrink-0"
                        aria-hidden
                      />
                      <span aria-current="page" className="bn-aware truncate font-medium">
                        {pageTitle}
                      </span>
                    </li>
                  )}
                </ol>
              </nav>
              <ThemeToggle className="mr-1" />
              <AccountMenu user={user} />
            </header>

            <main id="main" className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
              <div className="mx-auto w-full max-w-[1440px]">{children}</div>
            </main>
            <footer className="border-border mx-auto w-full max-w-[1440px] border-t px-4 py-5 sm:px-6 lg:px-8">
              <FooterNote />
            </footer>
          </div>
        </div>
      </TooltipProvider>
    </ShellContext.Provider>
  );
}

/**
 * The sidebar's contents. `rail` decides when only icons show: "always" (collapsed),
 * "below-xl" (icons under 1280 px, labels above) or "never" (the mobile drawer).
 */
function SidebarBody({
  user,
  pathname,
  reviewCount,
  rail,
  collapsed,
  onToggle,
}: {
  user: User;
  pathname: string;
  reviewCount: number | null;
  rail: "always" | "below-xl" | "never";
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  // Classes that show an element only when labels are visible.
  const label = rail === "always" ? "hidden" : rail === "below-xl" ? "hidden xl:inline" : "inline";
  const labelBlock =
    rail === "always" ? "hidden" : rail === "below-xl" ? "hidden xl:block" : "block";
  const railOnly = rail === "always" ? "" : rail === "below-xl" ? "xl:hidden" : "hidden";
  const groups = navFor(user.role);

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-2 px-4",
          rail === "always" && "justify-center px-0",
          rail === "below-xl" && "justify-center px-0 xl:justify-between xl:px-4",
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight"
          aria-label="Parallax home"
        >
          <LogoMark className="size-8" />
          <span className={cn("text-lg", label)}>Parallax</span>
        </Link>
        {onToggle && rail === "below-xl" && (
          <button
            type="button"
            onClick={onToggle}
            className="text-muted-foreground hover:bg-muted hover:text-foreground hidden size-8 cursor-pointer place-items-center rounded-lg xl:grid"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div className={cn("px-3 pt-2 pb-4", rail !== "never" && "max-xl:px-3")}>
        <RailTooltip label="New analysis" railOnly={railOnly}>
          <Link
            href="/dashboard/analyze"
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-[filter]",
              CTA_GRADIENT,
            )}
          >
            <Plus className="size-4" aria-hidden />
            <span className={label}>New analysis</span>
          </Link>
        </RailTooltip>
      </div>

      <nav aria-label="Dashboard" className="no-scrollbar flex-1 overflow-y-auto px-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <p
              className={cn(
                "text-muted-foreground mb-1.5 px-3 text-[11px] font-semibold tracking-wider uppercase",
                labelBlock,
              )}
            >
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item, pathname);
                const count = item.badge === "reviews" ? reviewCount : null;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <RailTooltip
                      label={count ? `${item.label} (${count} awaiting)` : item.label}
                      railOnly={railOnly}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                          rail === "always" && "justify-center px-0",
                          rail === "below-xl" && "justify-center px-0 xl:justify-start xl:px-3",
                          active
                            ? "bg-semantic-soft text-brand"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {active && (
                          <span
                            aria-hidden
                            className="bg-primary absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full"
                          />
                        )}
                        <Icon className="size-[18px] shrink-0" aria-hidden />
                        <span className={cn("flex-1 truncate", label)}>{item.label}</span>
                        {count ? (
                          <>
                            <span
                              className={cn(
                                "bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[11px] leading-none font-semibold tabular-nums",
                                label,
                              )}
                            >
                              {count > 99 ? "99+" : count}
                              <span className="sr-only"> awaiting review</span>
                            </span>
                            <span
                              aria-hidden
                              className={cn(
                                "bg-primary absolute top-2 right-2 size-2 rounded-full",
                                railOnly,
                              )}
                            />
                          </>
                        ) : null}
                      </Link>
                    </RailTooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-border border-t p-3">
        {onToggle && collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="text-muted-foreground hover:bg-muted hover:text-foreground mb-2 hidden h-9 w-full cursor-pointer place-items-center rounded-lg xl:grid"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="size-4" aria-hidden />
          </button>
        )}
        <div className={labelBlock}>
          <AccountMenu user={user} variant="card" />
        </div>
        <div className={railOnly}>
          <AccountMenu user={user} variant="card" compact />
        </div>
      </div>
    </div>
  );
}

/** A tooltip that only appears while the sidebar shows icons alone. */
function RailTooltip({
  label,
  railOnly,
  children,
}: {
  label: string;
  railOnly: string;
  children: ReactNode;
}) {
  if (railOnly === "hidden") return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" className={railOnly}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function ShellSkeleton() {
  return (
    <div className="bg-background min-h-dvh" aria-busy="true" aria-label="Loading">
      <div className="border-border fixed inset-y-0 left-0 hidden w-[72px] border-r md:block xl:w-[264px]" />
      <div className="md:pl-[72px] xl:pl-[264px]">
        <div className="border-border h-16 border-b" />
        <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
