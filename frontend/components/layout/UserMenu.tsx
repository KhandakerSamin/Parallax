"use client";

import { ChevronDown, IdCard, LayoutDashboard, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SignOutDialog } from "@/components/auth/SignOutDialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, idLabel, type User } from "@/lib/auth/types";
import { UserAvatar } from "./UserAvatar";

export function UserMenu({ user }: { user: User }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="group border-border/70 bg-card/60 hover:bg-muted data-[state=open]:bg-muted flex cursor-pointer items-center gap-2 rounded-full border p-0.5 transition-colors md:pr-2.5"
          data-testid="user-menu"
        >
          <span className="sr-only">Account menu for {user.name}</span>
          <UserAvatar name={user.name} src={user.avatarUrl} className="size-8" />
          <span aria-hidden className="hidden max-w-28 truncate text-sm font-medium md:block">
            {user.name.split(" ")[0]}
          </span>
          <ChevronDown
            aria-hidden
            className="text-muted-foreground hidden size-3.5 transition-transform group-data-[state=open]:rotate-180 md:block"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel className="flex items-start gap-3">
            <UserAvatar name={user.name} src={user.avatarUrl} className="size-10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-muted-foreground truncate text-xs font-normal">{user.email}</p>
              <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs font-normal">
                <IdCard className="size-3.5" aria-hidden />
                {idLabel(user.role)}:{" "}
                <span className="text-foreground font-mono">{user.universityId}</span>
              </p>
              <Badge variant="brand" className="mt-2">
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboard aria-hidden />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings aria-hidden />
            Settings
            <span className="text-muted-foreground ml-auto text-[10px]">Soon</span>
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
