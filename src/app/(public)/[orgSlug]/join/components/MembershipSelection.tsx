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
import { useTransition } from "react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { join } from "../_actions/join";
import { IMembershipTierProduct } from "@/lib/types/product";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, ShieldCheck, CreditCard, ClipboardCheck, Clock, ZapIcon, X } from "lucide-react";
import { Currency, MembershipActivationType } from "@/lib/types/membership";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$'
};

interface MembershipSelectionProps {
  memberships: IMembershipTierProduct[];
  groupId: string;
  userId: string;
}

export function MembershipSelection({ memberships, groupId, userId }: MembershipSelectionProps) {
  const [isPending, startTransition] = useTransition();
  const [state, action] = useToastActionState(join);
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Filter out organization-type tiers (they should be handled by OrganizationSelection)
  const individualMemberships = memberships.filter(
    tier => tier.membership_tier?.type !== 'organization'
  );

  // Handle redirect if provided in state
  useEffect(() => {
    if (state?.redirect) {
      router.push(state.redirect);
    }
  }, [state?.redirect, router]);

  if (!individualMemberships || individualMemberships.length === 0) {
    return (
      <Card className="max-w-lg mx-auto shadow-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">No Memberships Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">There are no memberships available at this time. Please check back later.</p>
        </CardContent>
      </Card>
    );
  }

  // Choose the middle tier as recommended if there are 3 tiers
  const recommendedTier = individualMemberships.length === 3 ? individualMemberships[1] : null;

  const handleSubmit = async (tier: IMembershipTierProduct) => {
    // If this tier requires a form, navigate to the form page
    if (
      tier.membership_tier?.activation_type === MembershipActivationType.FORM_REQUIRED ||
      tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_PAYMENT ||
      tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_REVIEW ||
      tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW ||
      tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
    ) {
      router.push(`${window.location.pathname}/${tier.id}`);
      return;
    }

    // Otherwise proceed with normal join flow
    const formData = new FormData();
    formData.set('membershipTierId', tier.id);
    formData.set('groupId', groupId);
    formData.set('userId', userId);

    startTransition(() => {
      action(formData);
    });
  };

  // Extract common features to create a comparison table
  const getActivationLabel = (activationType?: string) => {
    switch (activationType) {
      case MembershipActivationType.AUTOMATIC:
        return {
          label: "Instant Activation",
          icon: <ZapIcon className="h-4 w-4 text-emerald-500" />,
          color: "text-emerald-500"
        };
      case MembershipActivationType.REVIEW_REQUIRED:
        return {
          label: "Admin Review Required",
          icon: <ClipboardCheck className="h-4 w-4 text-amber-500" />,
          color: "text-amber-500"
        };
      case MembershipActivationType.PAYMENT_REQUIRED:
        return {
          label: "Payment Required",
          icon: <CreditCard className="h-4 w-4 text-blue-500" />,
          color: "text-blue-500"
        };
      case MembershipActivationType.FORM_REQUIRED:
        return {
          label: "Application Form Required",
          icon: <ClipboardCheck className="h-4 w-4 text-indigo-500" />,
          color: "text-indigo-500"
        };
      default:
        return {
          label: "Multiple Steps Required",
          icon: <Clock className="h-4 w-4 text-purple-500" />,
          color: "text-purple-500"
        };
    }
  };

  return (
    <div className="space-y-6">
      {individualMemberships.length > 1 && (
        <div className="flex justify-end mb-4">
          <Tabs defaultValue="cards" className="w-[250px]" onValueChange={(v) => setViewMode(v as 'cards' | 'table')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cards">Card View</TabsTrigger>
              <TabsTrigger value="table">Compare</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {viewMode === 'cards' && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {individualMemberships.map((tier) => {
            const isRecommended = tier.id === recommendedTier?.id;
            const activation = getActivationLabel(tier.membership_tier?.activation_type);
            
            return (
              <Card 
                key={tier.id} 
                className={`flex flex-col relative transition-all duration-300 ${
                  isRecommended 
                    ? 'border-primary shadow-lg shadow-primary/20 scale-[1.03] z-10' 
                    : 'hover:shadow-lg hover:border-primary/30 hover:translate-y-[-4px]'
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <Badge 
                      variant="default" 
                      className="bg-primary text-primary-foreground font-semibold py-1 px-3 flex items-center gap-1 shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Recommended
                    </Badge>
                  </div>
                )}
                
                <CardHeader className={`${isRecommended ? 'pt-7' : ''}`}>
                  <CardTitle className="text-xl md:text-2xl flex items-center justify-between">
                    {tier.name}
                    {tier.price === 0 && (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 font-medium">
                        Free
                      </Badge>
                    )}
                  </CardTitle>
                  {tier.description && (
                    <CardDescription className="mt-2 text-sm">{tier.description}</CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="flex-1 space-y-6">
                  {/* Price section */}
                  <div className="flex items-baseline">
                    <div className="text-3xl md:text-4xl font-bold">
                      {tier.price === 0 ? (
                        <span className="text-emerald-600">Free</span>
                      ) : (
                        <>
                          {currencySymbols[tier.currency as Currency]}
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
                  <div className="bg-muted/50 p-3 rounded-lg border border-muted">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                      {activation.icon}
                      <span className={`font-medium text-sm ${activation.color}`}>
                        {activation.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tier.membership_tier?.activation_type === MembershipActivationType.AUTOMATIC && (
                        <span>Your membership will be active immediately after joining.</span>
                      )}
                      {tier.membership_tier?.activation_type === MembershipActivationType.REVIEW_REQUIRED && (
                        <span>An administrator will review your application before approval.</span>
                      )}
                      {tier.membership_tier?.activation_type === MembershipActivationType.PAYMENT_REQUIRED && (
                        <span>Payment is required to activate your membership.</span>
                      )}
                      {tier.membership_tier?.activation_type === MembershipActivationType.FORM_REQUIRED && (
                        <span>You'll need to complete an application form before membership is activated.</span>
                      )}
                      {(tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_PAYMENT || 
                        tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_REVIEW ||
                        tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW ||
                        tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT) && (
                        <span>This membership requires multiple steps including form completion and possibly payment or admin review.</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Features section - replace with actual tier features if available */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Features</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span>Access to member resources</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span>Community participation</span>
                      </li>
                      {tier.price > 0 && (
                        <li className="flex items-start">
                          <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                          <span>Premium support</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </CardContent>
                
                <CardFooter className="pt-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className={`w-full transition-all ${isRecommended ? 'bg-primary hover:bg-primary/90 text-lg py-6' : ''}`}
                          onClick={() => handleSubmit(tier)}
                          disabled={isPending}
                          size={isRecommended ? "lg" : "default"}
                        >
                          {isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          {tier.price === 0 ? "Join Now" : "Apply Now"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {tier.membership_tier?.activation_type === MembershipActivationType.AUTOMATIC
                          ? "Instant access upon joining"
                          : tier.membership_tier?.activation_type === MembershipActivationType.FORM_REQUIRED
                          ? "Complete an application form to join"
                          : "Start your application process"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {viewMode === 'table' && individualMemberships.length > 1 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-4 text-left font-medium text-muted-foreground">Features</th>
                {individualMemberships.map(tier => (
                  <th key={tier.id} className="p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-lg mb-1">{tier.name}</span>
                      <span className="font-medium text-xl mb-2">
                        {tier.price === 0 ? (
                          <span className="text-emerald-600">Free</span>
                        ) : (
                          <span>
                            {currencySymbols[tier.currency as Currency]}
                            {(tier.price / 100).toFixed(2)}
                          </span>
                        )}
                      </span>
                      {tier.id === recommendedTier?.id && (
                        <Badge variant="default" className="bg-primary text-xs">
                          Recommended
                        </Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-4 font-medium">Activation</td>
                {individualMemberships.map(tier => {
                  const activation = getActivationLabel(tier.membership_tier?.activation_type);
                  return (
                    <td key={`${tier.id}-activation`} className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {activation.icon}
                        </div>
                        <span className={`text-xs ${activation.color}`}>{activation.label}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
              <tr className="border-t">
                <td className="p-4 font-medium">Duration</td>
                {individualMemberships.map(tier => (
                  <td key={`${tier.id}-duration`} className="p-4 text-center">
                    {tier.membership_tier?.duration_months 
                      ? `${tier.membership_tier.duration_months} months` 
                      : "Unlimited"}
                  </td>
                ))}
              </tr>
              <tr className="border-t">
                <td className="p-4 font-medium">Benefits</td>
                {individualMemberships.map(tier => (
                  <td key={`${tier.id}-benefits`} className="p-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm">Member Resources</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm">Community Access</span>
                      </span>
                      {tier.price > 0 && (
                        <span className="flex items-center gap-1">
                          <Check className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm">Premium Support</span>
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="border-t">
                <td className="p-4"></td>
                {individualMemberships.map(tier => (
                  <td key={`${tier.id}-action`} className="p-4 text-center">
                    <Button
                      className={tier.id === recommendedTier?.id ? 'bg-primary hover:bg-primary/90 w-full' : 'w-full'}
                      onClick={() => handleSubmit(tier)}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {tier.price === 0 ? "Join Now" : "Apply Now"}
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 