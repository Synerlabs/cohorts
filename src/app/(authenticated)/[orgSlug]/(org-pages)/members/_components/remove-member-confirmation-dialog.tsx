'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LoadingButton from "@/components/ui/loading-button";

interface RemoveMemberConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  onConfirm: () => Promise<void>; // Make onConfirm async
  isPending?: boolean; // Optional pending state for the button
}

export default function RemoveMemberConfirmationDialog({
  isOpen,
  onOpenChange,
  memberName,
  onConfirm,
  isPending = false,
}: RemoveMemberConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Trigger is handled externally by the button in MemberActionsCell */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will remove{' '}
            <span className="font-semibold">{memberName}</span> from the organization.
            If they have a pending invite, the invite will effectively be cancelled.
            This action cannot be undone easily.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <LoadingButton
            onClick={onConfirm} // Call the passed async confirmation handler
            variant="destructive"
            loading={isPending}
            disabled={isPending}
          >
            {isPending ? "Removing..." : "Confirm Remove"}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 