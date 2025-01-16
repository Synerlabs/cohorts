"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { startTransition } from "react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { deleteMembershipAction } from "../_actions/membership.action";

interface DeleteMembershipDialogProps {
  membershipId: string;
  groupId: string;
  membershipName: string;
  children: React.ReactNode;
}

export default function DeleteMembershipDialog({
  membershipId,
  groupId,
  membershipName,
  children,
}: DeleteMembershipDialogProps) {
  const [state, action, pending] = useToastActionState(
    deleteMembershipAction,
    { success: false },
    undefined,
    {
      successTitle: "Membership Deleted",
      successDescription: "The membership has been deleted successfully",
    }
  );

  const handleDelete = () => {
    startTransition(() => {
      const formData = new FormData();
      formData.append("id", membershipId);
      formData.append("group_id", groupId);
      action(formData);
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Membership</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the membership &quot;{membershipName}&quot;? This action cannot be undone.
            {state?.error && (
              <p className="mt-2 text-red-600">{state.error}</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 