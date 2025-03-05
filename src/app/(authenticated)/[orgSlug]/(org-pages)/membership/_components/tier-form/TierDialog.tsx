"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TierForm } from "./TierForm";
import { TierType } from "./TierFormContext";

export interface TierDialogProps {
  triggerButton: React.ReactNode;
  groupId: string;
  tierType: TierType;
  dialogTitle?: string;
  dialogDescription?: string;
  children: React.ReactNode;
}

export function TierDialog({
  triggerButton,
  groupId,
  tierType,
  dialogTitle,
  dialogDescription,
  children,
}: TierDialogProps) {
  const [open, setOpen] = useState(false);

  // Default titles based on tier type
  const title = dialogTitle || 
    (tierType === "membership" ? "Create Membership Tier" : "Create Organization Tier");
  
  const description = dialogDescription || 
    (tierType === "membership" 
      ? "Create a new tier for members to join your organization" 
      : "Create a new tier for organizations to affiliate with yours");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <TierForm
          tierType={tierType}
          groupId={groupId}
          onSuccess={() => setOpen(false)}
        >
          {children}
        </TierForm>
      </DialogContent>
    </Dialog>
  );
} 