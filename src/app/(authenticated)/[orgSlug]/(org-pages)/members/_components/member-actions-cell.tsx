'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClientComponentPermission } from "@/components/ClientComponentPermission"; // Use client version
import { permissions } from "@/lib/types/permissions";
import RemoveMemberConfirmationDialog from './remove-member-confirmation-dialog'; // Import the dialog
import { removeMemberAction, resendInviteAction } from '@/actions/member.actions'; // Import the action and resend action
import { useToast } from '@/components/ui/use-toast'; // Import toast
import { useRouter } from 'next/navigation'; // Import router
import { useUser } from '@/lib/context/UserContext'; // Import user context
import { Send } from "lucide-react"; // Removed Pencil icon
import { Loader2, Trash2 } from "lucide-react"; // Import Loader2 and Trash2 icons

interface MemberActionsCellProps {
  orgId: string;
  orgSlug: string; // Add orgSlug
  groupUsersId: string; // This is the ID of the group_users record
  userEmail: string | null;
  userName: string | null;
  isActive: boolean;
  isDeleted: boolean; // Add isDeleted prop
}

export function MemberActionsCell({
  orgId,
  orgSlug, // Receive orgSlug
  groupUsersId,
  userEmail,
  userName,
  isActive,
  isDeleted, // Receive isDeleted
}: MemberActionsCellProps) {
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [isRemovePending, setIsRemovePending] = useState(false);
  const [isResendPending, setIsResendPending] = useState(false); // State for resend pending
  const { toast } = useToast();
  const router = useRouter();
  const { user: currentUser } = useUser(); // Get current user for context

  const memberDisplayName = userName || userEmail || groupUsersId; // Fallback display name

  const handleRemoveClick = () => {
    setIsRemoveConfirmOpen(true); 
  };

  const handleRemoveConfirm = async () => {
    setIsRemovePending(true);

    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      setIsRemovePending(false);
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
      setIsRemovePending(false); // Ensure pending state is reset
    }
  };

  // Handler for resending invite
  const handleResendInvite = async () => {
    setIsResendPending(true);

    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      setIsResendPending(false);
      return;
    }
    if (!userEmail) {
      toast({ variant: "destructive", title: "Error", description: "Cannot resend invite without an email address." });
      setIsResendPending(false);
      return;
    }
    
    const formData = new FormData();
    formData.append('groupUsersId', groupUsersId);
    formData.append('email', userEmail);
    formData.append('orgSlug', orgSlug); // Add orgSlug for redirect URL construction
    
    const context = { userId: currentUser.id, groupId: orgId };
    
    try {
      const result = await resendInviteAction(context, formData);
      if (result.error) {
        toast({ variant: "destructive", title: "Failed to resend invite", description: result.error });
      } else {
        toast({ title: "Success", description: "Invitation resent successfully." });
        // No router.refresh() needed as the data hasn't changed, just the invite email
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error?.message || "An unexpected error occurred." });
      console.error("Resend invite error:", error);
    } finally {
      setIsResendPending(false); // Reset pending state
    }
  };

  return (
    <div className="text-right flex items-center justify-end gap-1"> {/* Use flex for button alignment */}
      {/* Resend Invite Button - Shown only if pending */}
      {!isActive && !isDeleted && (
         <ClientComponentPermission requiredPermissions={[permissions.members.invite]}>
           <Button 
             variant="ghost"
             size="icon" // Make it an icon button
             onClick={handleResendInvite}
             disabled={isResendPending || !userEmail} // Disable if pending or no email
             title={!userEmail ? "Cannot resend without email" : (isResendPending ? "Resending..." : "Resend Invite")}
             className="h-8 w-8" // Adjust size
           >
             {isResendPending ? (
               <Loader2 className="h-4 w-4 animate-spin" />
             ) : (
               <Send className="h-4 w-4" />
             )}
             <span className="sr-only">Resend Invite</span>
           </Button>
        </ClientComponentPermission>
      )}
      
      {/* Remove Button - Shown only if not deleted */}
      {!isDeleted && (
        <ClientComponentPermission requiredPermissions={[permissions.members.remove]}>
          <Button 
            variant="ghost" 
            size="icon" // Make it an icon button
            onClick={handleRemoveClick}
            disabled={isRemovePending} // Disable only when remove is pending
            title={isRemovePending ? "Removing..." : "Remove member or cancel invite"}
            className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground" // Destructive hover
          >
            {isRemovePending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Trash2 className="h-4 w-4" /> // Use Trash2 icon
            )}
            <span className="sr-only">Remove</span>
          </Button>
        </ClientComponentPermission>
      )}

      {/* Confirmation Dialog (Remove Member) */}
      {!isDeleted && (
        <RemoveMemberConfirmationDialog 
          isOpen={isRemoveConfirmOpen}
          onOpenChange={setIsRemoveConfirmOpen}
          memberName={memberDisplayName} 
          onConfirm={handleRemoveConfirm}
          isPending={isRemovePending}
        /> 
      )}
    </div>
  );
} 