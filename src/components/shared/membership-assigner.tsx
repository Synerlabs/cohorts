"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { IMembershipTierProduct } from '@/lib/types/product';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, PlusCircle, Info } from "lucide-react";

// Define the context type
interface MembershipAssignerContextType {
  availableTiers: IMembershipTierProduct[];
  selectedTierId: string | null;
  isAssigning: boolean;
  onSelectTier: (tierId: string) => void;
  onAssignMembership: () => void;
  texts?: {
    title?: string;
    tierSelectLabel?: string;
    tierSelectPlaceholder?: string;
    assignButtonText?: string;
    assignButtonLoadingText?: string;
    noTiersMessage?: string;
  }
}

const MembershipAssignerContext = createContext<MembershipAssignerContextType | undefined>(undefined);

const useMembershipAssignerContext = () => {
  const context = useContext(MembershipAssignerContext);
  if (!context) {
    throw new Error('useMembershipAssignerContext must be used within a MembershipAssigner provider');
  }
  return context;
};

// Prop types for the main component
interface MembershipAssignerProps extends Omit<MembershipAssignerContextType, 'texts'> {
  children: ReactNode;
  texts?: MembershipAssignerContextType['texts'];
}

// Main Compound Component Wrapper
const MembershipAssigner = ({ children, texts, ...props }: MembershipAssignerProps) => {
  const contextValue = {
    ...props,
    texts: {
      title: texts?.title || "Assign New Membership",
      tierSelectLabel: texts?.tierSelectLabel || "Membership Tier",
      tierSelectPlaceholder: texts?.tierSelectPlaceholder || "Select a tier...",
      assignButtonText: texts?.assignButtonText || "Assign Membership",
      assignButtonLoadingText: texts?.assignButtonLoadingText || "Assigning...",
      noTiersMessage: texts?.noTiersMessage || "No active membership tiers available to assign.",
      ...(texts || {}), // Spread any user-provided texts to override defaults
    }
  };
  return (
    <MembershipAssignerContext.Provider value={contextValue}>
      {children}
    </MembershipAssignerContext.Provider>
  );
};

// Sub-components
const RootCard = ({ children, className }: { children: ReactNode, className?: string }) => {
  return (
    <Card className={`border border-dashed shadow-none hover:border-primary/20 transition-colors group ${className || ''}`}>
      <CardContent className="p-4 pt-4">
        {children}
      </CardContent>
    </Card>
  );
};
MembershipAssigner.RootCard = RootCard;

const Title = ({ className }: { className?: string }) => {
  const { texts } = useMembershipAssignerContext();
  return (
    <h4 className={`text-sm font-medium mb-3 flex items-center gap-2 ${className || ''}`}>
      <PlusCircle className="h-4 w-4 text-primary" />
      <span>{texts?.title}</span>
    </h4>
  );
};
MembershipAssigner.Title = Title;

const TierSelect = ({ className }: { className?: string }) => {
  const { availableTiers, selectedTierId, onSelectTier, isAssigning, texts } = useMembershipAssignerContext();
  return (
    <div className={`flex-grow ${className || ''}`}>
      <Label htmlFor="tier-select-assigner" className="text-xs mb-1.5 block text-muted-foreground">
        {texts?.tierSelectLabel}
      </Label>
      <Select 
        value={selectedTierId || ""} 
        onValueChange={onSelectTier}
        disabled={isAssigning}
      >
        <SelectTrigger id="tier-select-assigner" className="flex-grow bg-background">
          <SelectValue placeholder={texts?.tierSelectPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {availableTiers.map((tier) => (
            <SelectItem key={tier.id} value={tier.id}>
              <div className="flex justify-between items-center w-full">
                <span>{tier.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {tier.currency} {tier.price.toFixed(2)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
MembershipAssigner.TierSelect = TierSelect;

const AssignButton = ({ className }: { className?: string }) => {
  const { selectedTierId, isAssigning, onAssignMembership, texts } = useMembershipAssignerContext();
  return (
    <div className={`sm:self-end ${className || ''}`}>
      <Button 
        onClick={onAssignMembership}
        disabled={!selectedTierId || isAssigning}
        className="px-4 h-10 sm:w-auto w-full"
      >
        {isAssigning ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <PlusCircle className="h-4 w-4 mr-2" />
        )}
        {isAssigning ? texts?.assignButtonLoadingText : texts?.assignButtonText}
      </Button>
    </div>
  );
};
MembershipAssigner.AssignButton = AssignButton;

const NoTiersMessage = ({ className }: { className?: string }) => {
  const { texts } = useMembershipAssignerContext();
  return (
    <div className={`text-xs flex items-center gap-2 text-muted-foreground border rounded-md p-3 bg-muted/10 ${className || ''}`}>
      <Info className="h-4 w-4" />
      <p>{texts?.noTiersMessage}</p>
    </div>
  );
};
MembershipAssigner.NoTiersMessage = NoTiersMessage;

// Optional: A default layout component if users want a quick setup
const DefaultLayout = ({ titleClassName, tierSelectClassName, assignButtonClassName, noTiersMessageClassName, rootCardClassName } : 
  { titleClassName?: string; tierSelectClassName?: string; assignButtonClassName?: string; noTiersMessageClassName?: string, rootCardClassName?: string; }
) => {
  const { availableTiers } = useMembershipAssignerContext();
  return (
    <>
      <MembershipAssigner.Title className={titleClassName} />
      <MembershipAssigner.RootCard className={rootCardClassName}>
        {availableTiers.length > 0 ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <MembershipAssigner.TierSelect className={tierSelectClassName} />
            <MembershipAssigner.AssignButton className={assignButtonClassName} />
          </div>
        ) : (
          <MembershipAssigner.NoTiersMessage className={noTiersMessageClassName} />
        )}
      </MembershipAssigner.RootCard>
    </>
  );
}
MembershipAssigner.DefaultLayout = DefaultLayout;

export { MembershipAssigner }; 