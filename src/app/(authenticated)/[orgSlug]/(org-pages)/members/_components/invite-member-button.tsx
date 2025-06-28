'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { InviteMemberModal } from './invite-member-modal'; // We will create this next
import { PlusCircle } from 'lucide-react';

interface InviteMemberButtonProps {
  orgId: string;
  orgSlug: string;
}

export function InviteMemberButton({ orgId, orgSlug }: InviteMemberButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)} size="sm">
        <PlusCircle className="mr-2 h-4 w-4" />
        Invite Member
      </Button>
      <InviteMemberModal 
        isOpen={isModalOpen} 
        setIsOpen={setIsModalOpen} 
        orgId={orgId} 
        orgSlug={orgSlug} 
      />
    </>
  );
} 