"use client";
import { TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { removeRoleUserAction } from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/[roleId]/users/_actions/role-user.action";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import LoadingButton from "@/components/ui/loading-button";
import { useState } from "react";

export default function UserTableRow({ userRole }: { userRole: any }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteState, removeUser, deletePending] = useToastActionState(
    removeRoleUserAction,
    { id: userRole.id },
    null,
    {
      successTitle: "Success",
      successDescription: "User removed successfully.",
    },
  );

  const handleDelete = () => {
    removeUser({ id: userRole.id });
  };

  return (
    <TableRow>
      <TableCell className="hidden sm:table-cell">
        <Avatar>
          <AvatarImage
            alt="Avatar"
            className="aspect-square rounded-md object-cover"
            height="64"
            src="/placeholder.svg"
            width="64"
          />
          <AvatarFallback>
            {userRole.profile?.first_name?.charAt(0)}
            {userRole.profile?.last_name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell className="font-medium">
        {userRole.profile?.first_name}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {userRole.createdAt}
      </TableCell>
      <TableCell>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button
              aria-haspopup="true"
              size="icon"
              variant="ghost"
              className="hover:bg-destructive hover:text-destructive-foreground"
            >
              <TrashIcon className="h-4 w-4" />
              <span className="sr-only">Remove user from role</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove user from role</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this user from the role?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className="w-full"
                onClick={() => deleteState?.handlePrevious()}
              >
                Cancel
              </AlertDialogCancel>
              <LoadingButton
                className="w-full"
                onClick={handleDelete}
                variant="destructive"
                loading={deletePending}
              >
                Remove user
              </LoadingButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}
