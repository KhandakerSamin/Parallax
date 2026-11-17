"use client";

import { ChevronsUpDown, Gavel, LayoutDashboard, LogOut, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SignOutDialog } from "@/components/auth/SignOutDialog";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, isAdmin, isReviewer, type User } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

/**
 * The account menu. `variant="avatar"` is the round button in the top bar;
 * `variant="card"` is the user card at the foot of the sidebar (`compact` in the icon rail).
 */
export function AccountMenu({
  user,
  variant = "avatar",
  compact = false,
}: {
  user: User;
  variant?: "avatar" | "card";
  compact?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === "avatar" ? (
            <button
              type="button"
              aria-label="Account menu"
              className="ring-offset-background hover:ring-border cursor-pointer rounded-full ring-2 ring-transparent transition-shadow"
            >
              <UserAvatar name={user.name} src={user.avatarUrl} className="size-9" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Account menu"
              className={cn(
                "hover:bg-muted flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors",
                compact && "justify-center",
              )}
            >
              <UserAvatar name={user.name} src={user.avatarUrl} className="size-9 shrink-0" />
              {!compact && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{user.name}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </span>
                  <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" aria-hidden />
                </>
              )}
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={variant === "avatar" ? "end" : "start"}
          side={variant === "avatar" ? "bottom" : "top"}
          className="w-64"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-3">
              <UserAvatar name={user.name} src={user.avatarUrl} className="size-10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="text-muted-foreground truncate text-xs">{user.email}</p>
              </div>
            </div>
            <Badge variant="brand" className="mt-2.5">
              {ROLE_LABELS[user.role]}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboard aria-hidden />
              Overview
            </Link>
          </DropdownMenuItem>
          {isReviewer(user.role) && (
            <DropdownMenuItem asChild>
              <Link href="/dashboard/reviews">
                <Gavel aria-hidden />
                Review queue
              </Link>
            </DropdownMenuItem>
          )}
          {isAdmin(user.role) && (
            <DropdownMenuItem asChild>
              <Link href="/dashboard/admin">
                <Users aria-hidden />
                Administration
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <Settings aria-hidden />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setConfirmOpen(true)}
            className="text-danger [&_svg]:!text-danger"
          >
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SignOutDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  );
}
