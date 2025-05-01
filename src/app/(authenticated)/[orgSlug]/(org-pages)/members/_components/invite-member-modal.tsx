'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
// Removed Button import as it's now handled within the form content
import { InviteMemberFormContent } from './invite-member-form-content'; // Import the new form content

interface InviteMemberModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  orgId: string;
  orgSlug: string;
}

export function InviteMemberModal({
  isOpen,
  setIsOpen,
  orgId,
  orgSlug,
}: InviteMemberModalProps) {

  const onOpenChange = (open: boolean) => {
    if (!open) {
      setIsOpen(false);
      // Reset form state if necessary when modal closes might need to be handled
      // within InviteMemberFormContent or by passing a reset function.
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md"> {/* Adjusted width slightly */}
        <DialogHeader>
          <DialogTitle>Invite New Member</DialogTitle>
          {/* Description can be removed or kept as is */}
          {/* <DialogDescription>
            Enter the email address of the member you want to invite to {orgSlug}.
          </DialogDescription> */}
        </DialogHeader>
        
        {/* Replace placeholder with the actual form content */}
        <InviteMemberFormContent 
          orgId={orgId} 
          orgSlug={orgSlug} 
          closeModal={() => setIsOpen(false)} 
        />
        
      </DialogContent>
    </Dialog>
  );
} 