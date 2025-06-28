"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

type InviteAffiliateButtonProps = {
  orgId: string;
  orgSlug: string;
}

export function InviteAffiliateButton({
  orgId,
  orgSlug
}: InviteAffiliateButtonProps) {
  const handleOpenInviteModal = () => {
    // Will implement modal opening functionality later
    alert("Invite affiliate functionality will be implemented later");
  };

  return (
    <Button onClick={handleOpenInviteModal}>
      <PlusIcon className="mr-2 h-4 w-4" />
      Invite Affiliate
    </Button>
  );
} 