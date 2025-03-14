'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTransition, useState, useEffect, useRef } from "react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { join } from "../_actions/join";
import { IMembershipTierProduct } from "@/lib/types/product";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, Plus, Building } from "lucide-react";
import { Currency, MembershipActivationType } from "@/lib/types/membership";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { createClient } from '@/lib/utils/supabase/client';
import { useToast } from "@/components/ui/use-toast";

interface Organization {
  id: string;
  name: string;
}

interface OrganizationSelectionProps {
  tier: IMembershipTierProduct;
  groupId: string;
  userId: string;
}

// Define a type for our debug info object
interface DebugInfo {
  userGroups: string[];
  ownedGroups: Array<{id: string; name: string}>;
  filteredGroups: any[];
  currentGroupId: string;
  filteringSteps: any[];
  finalOrgs: any[];
  affiliations: {
    asParent: any[];
    asChild: any[];
    combinedAffiliationIds: string[];
  };
  tiers: any[];
  error?: string;
  permissionIssue?: boolean;
  tier?: any;
  apiResponse?: any;
  usingApi?: boolean;
  suggestApiEndpoint?: boolean;
}

export function OrganizationSelection({ tier, groupId, userId }: OrganizationSelectionProps) {
  const [isPending, startTransition] = useTransition();
  const [state, action] = useToastActionState(join);
  const router = useRouter();
  const { toast } = useToast();
  
  // We'll no longer need most state since we're redirecting to another page
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle redirect if provided in state
  if (state?.redirect) {
    router.push(state.redirect);
  }

  const currencySymbol = tier.currency ? 
    (currencySymbols[tier.currency as Currency] || '$') : 
    '$';

  // Function to navigate to organization selection page
  const navigateToOrgSelection = () => {
    // Get the current organization slug from the URL
    const pathSegments = window.location.pathname.split('/');
    const orgSlug = pathSegments[1]; // The slug will be the segment after the first slash
    
    // Navigate to the organization selection page with necessary parameters
    router.push(`/${orgSlug}/join/select-organization?tierId=${tier.id}&groupId=${groupId}&userId=${userId}`);
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl flex items-center justify-between">
          {tier.name}
          {tier.price === 0 && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              Free
            </Badge>
          )}
        </CardTitle>
        {tier.description && (
          <CardDescription>{tier.description}</CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Price section */}
        <div className="flex items-baseline">
          <div className="text-3xl font-bold">
            {tier.price === 0 ? (
              <span className="text-emerald-600">Free</span>
            ) : (
              <>
                {currencySymbol}
                {(tier.price / 100).toFixed(2)}
              </>
            )}
          </div>
          {tier.membership_tier?.duration_months && tier.price > 0 && (
            <div className="text-sm text-muted-foreground ml-2">
              {tier.membership_tier?.duration_months === 1
                ? "per month"
                : `for ${tier.membership_tier?.duration_months} months`}
            </div>
          )}
        </div>
        
        {/* Activation process section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium border-b pb-1">Activation Process</h4>
          <div className="text-sm text-muted-foreground space-y-2">
            {tier.membership_tier?.activation_type === MembershipActivationType.AUTOMATIC ? 'automatic' :
            tier.membership_tier?.activation_type === MembershipActivationType.REVIEW_REQUIRED ? 'review_required' :
            tier.membership_tier?.activation_type === MembershipActivationType.PAYMENT_REQUIRED ? 'payment_required' :
            tier.membership_tier?.activation_type === MembershipActivationType.REVIEW_THEN_PAYMENT ? 'review_then_payment' :
            tier.membership_tier?.activation_type === MembershipActivationType.FORM_REQUIRED ? 'form_required' :
            tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_REVIEW ? 'form_then_review' :
            tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_PAYMENT ? 'form_then_payment' :
            tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW ? 'form_then_payment_then_review' :
            tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT ? 'form_then_review_then_payment' :
            'standard'}
          </div>
        </div>
        
        {/* Information about organization affiliation */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-medium">Organization Affiliation</h4>
          <p className="text-sm text-muted-foreground">
            This tier allows you to affiliate an organization with {groupId ? "this organization" : "the parent organization"}.
          </p>
          <p className="text-sm text-muted-foreground">
            You can either select an existing organization you own or create a new one.
          </p>
        </div>
      </CardContent>
      
      {/* Button to navigate to organization selection */}
      <div className="pt-6">
        <Button
          className="w-full"
          onClick={navigateToOrgSelection}
          disabled={isPending || isSubmitting}
        >
          <Building className="mr-2 h-4 w-4" />
          Select or Create Organization
        </Button>
      </div>
    </Card>
  );
}

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$'
}; 