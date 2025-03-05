"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { 
  TierDialog, 
  BasicInfoFields, 
  PriceFields, 
  RelationshipTypeField, 
  FormTemplateField, 
  ActivationProcessFields, 
  FormDivider 
} from "../../membership/_components/tier-form";

export interface OrganizationTierDialogProps {
  trigger?: React.ReactNode;
  hostGroupId: string;
}

export function OrganizationTierDialog({
  trigger,
  hostGroupId,
}: OrganizationTierDialogProps) {
  const defaultTrigger = (
    <Button variant="outline">Create Tier</Button>
  );
  
  return (
    <TierDialog
      triggerButton={trigger || defaultTrigger}
      groupId={hostGroupId}
      tierType="organization"
    >
      <BasicInfoFields />
      <FormDivider />
      <RelationshipTypeField />
      <FormDivider />
      <PriceFields />
      <FormDivider />
      <ActivationProcessFields />
      <FormDivider />
      <FormTemplateField />
    </TierDialog>
  );
} 