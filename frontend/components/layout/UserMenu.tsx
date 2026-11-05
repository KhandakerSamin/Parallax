"use client";

import { LayoutDashboard, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SignOutDialog } from "@/components/auth/SignOutDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type User } from "@/lib/auth/types";
import { initials } from "@/lib/utils";

export function UserMenu({ user }: { user: User }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="cursor-pointer rounded-full ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-border"
          aria-label={`Account menu for ${user.name}`}
        >
          <Avatar>
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
            <Badge variant="brand" className="mt-2">
              {ROLE_LABELS[user.role]}
            </Badge>
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
            <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-danger [&_svg]:!text-danger">
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SignOutDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  );
}
