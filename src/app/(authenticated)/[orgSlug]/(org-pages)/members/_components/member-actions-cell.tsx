'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClientComponentPermission } from "@/components/ClientComponentPermission"; // Use client version
import { permissions } from "@/lib/types/permissions";
import RemoveMemberConfirmationDialog from './remove-member-confirmation-dialog'; // Import the dialog
import { removeMemberAction } from '@/actions/member.actions'; // Import the action
import { useToast } from '@/components/ui/use-toast'; // Import toast
import { useRouter } from 'next/navigation'; // Import router
import { useUser } from '@/lib/context/UserContext'; // Import user context

interface MemberActionsCellProps {
  orgId: string;
  groupUsersId: string; // This is the ID of the group_users record
  userEmail: string | null;
  userName: string | null;
  isActive: boolean;
  isDeleted: boolean; // Add isDeleted prop
}

export function MemberActionsCell({
  orgId,
  groupUsersId,
  userEmail,
  userName,
  isActive,
  isDeleted // Receive isDeleted
}: MemberActionsCellProps) {
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [isPending, setIsPending] = useState(false); // Add pending state
  const { toast } = useToast();
  const router = useRouter();
  const { user: currentUser } = useUser(); // Get current user for context

  const memberDisplayName = userName || userEmail || groupUsersId; // Fallback display name

  const handleRemoveClick = () => {
    setIsRemoveConfirmOpen(true); 
  };

  const handleRemoveConfirm = async () => {
    setIsPending(true); // Set pending state

    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      setIsPending(false);
      return;
    }
    
    const formData = new FormData();
    formData.append('groupUsersId', groupUsersId);
    
    // Construct context required by the action
    const context = { userId: currentUser.id, groupId: orgId };
    
    try {
      const result = await removeMemberAction(context, formData);
      if (result.error) {
        toast({ variant: "destructive", title: "Failed to remove member", description: result.error });
      } else {
        toast({ title: "Success", description: "Member removed." });
        router.refresh(); // Refresh data on the page
        setIsRemoveConfirmOpen(false); // Close dialog on success
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error?.message || "An unexpected error occurred." });
      console.error("Remove member error:", error);
    } finally {
      setIsPending(false); // Ensure pending state is reset
    }
  };

  return (
    <div className="text-right"> {/* Added wrapper div for alignment */}
      {/* Hide button entirely if user is deleted */}
      {!isDeleted && (
        <ClientComponentPermission requiredPermissions={[permissions.members.remove]}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRemoveClick}
            title="Remove member or cancel invite"
            // Button is now the implicit trigger for the dialog 
            // (though the dialog component itself doesn't use AlertDialogTrigger)
          >
            Remove
          </Button>
        </ClientComponentPermission>
      )}

      {/* Only render the dialog if the user is not deleted (dialog shouldn't be needed) */}
      {!isDeleted && (
        <RemoveMemberConfirmationDialog 
          isOpen={isRemoveConfirmOpen}
          onOpenChange={setIsRemoveConfirmOpen}
          memberName={memberDisplayName} 
          onConfirm={handleRemoveConfirm}
          isPending={isPending} // Pass pending state
        /> 
      )}
    </div>
  );
} 