"use client";

import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TierForm } from "./TierForm";
import { TierType } from "./TierFormContext";

export interface TierSlidingPaneProps {
  triggerButton: React.ReactNode;
  groupId: string;
  tierType: TierType;
  title?: string;
  description?: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  children: React.ReactNode;
}

export function TierSlidingPane({
  triggerButton,
  groupId,
  tierType,
  title,
  description,
  onOpenChange,
  open: controlledOpen,
  children
}: TierSlidingPaneProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled 
    ? (value: boolean) => onOpenChange?.(value) 
    : setInternalOpen;
    
  const defaultTitle = tierType === 'membership' 
    ? 'Create Membership Tier' 
    : 'Create Organization Tier';
  
  const defaultDescription = tierType === 'membership'
    ? 'Set up a new membership tier with pricing, benefits, and activation requirements.'
    : 'Create a new tier for organizations to affiliate with yours.';

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {triggerButton}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title || defaultTitle}</SheetTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </SheetHeader>
        <div className="mt-4 pb-6">
          <TierForm
            groupId={groupId}
            tierType={tierType}
            onSuccess={() => setIsOpen(false)}
          >
            {children}
          </TierForm>
        </div>
      </SheetContent>
    </Sheet>
  );
} 