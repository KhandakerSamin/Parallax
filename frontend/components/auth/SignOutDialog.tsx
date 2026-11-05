"use client";

import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type SignOutDialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

/** Confirms before signing out, then clears the session and returns home. */
export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const { signOut } = useAuth();
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await signOut();
      toast.success("Signed out");
    } finally {
      setPending(false);
      onOpenChange(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <span className="grid size-11 place-items-center rounded-xl bg-structural-soft text-structural">
          <LogOut className="size-5" aria-hidden />
        </span>
        <AlertDialogTitle className="mt-4">Sign out of Parallax?</AlertDialogTitle>
        <AlertDialogDescription>You&apos;ll need to sign in again to view your reports.</AlertDialogDescription>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </AlertDialogCancel>
          {/* Not AlertDialogAction: that would close the dialog before sign-out finishes. */}
          <Button variant="danger" onClick={handleConfirm} disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Sign out
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
