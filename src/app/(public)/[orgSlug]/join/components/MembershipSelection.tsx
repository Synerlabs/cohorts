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
import { Check, Loader2, Sparkles } from "lucide-react";
import { Currency, MembershipActivationType } from "@/lib/types/membership";

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

  if (!memberships || memberships.length === 0) {
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
  const recommendedTier = memberships.length === 3 ? memberships[1] : null;

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

  // Handle redirect if provided in state
  if (state?.redirect) {
    router.push(state.redirect);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {memberships.map((tier) => {
          const isRecommended = tier.id === recommendedTier?.id;
          const activationType = tier.membership_tier?.activation_type;
          
          return (
            <Card 
              key={tier.id} 
              className={`flex flex-col relative transition-all duration-200 ${
                isRecommended 
                  ? 'border-primary/50 shadow-lg shadow-primary/10 scale-105 z-10' 
                  : 'hover:shadow-md hover:border-primary/20'
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <Badge 
                    variant="default" 
                    className="bg-primary text-primary-foreground font-medium flex items-center gap-1"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Recommended
                  </Badge>
                </div>
              )}
              
              <CardHeader className={`${isRecommended ? 'pt-6' : ''}`}>
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
              
              <CardContent className="flex-1">
                <div className="space-y-6">
                  {/* Price section */}
                  <div className="flex items-baseline">
                    <div className="text-3xl font-bold">
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
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium border-b pb-1">Activation Process</h4>
                    <div className="text-sm text-muted-foreground space-y-2">
                      {activationType === 'automatic' && (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-emerald-500 mr-2" />
                          <span>Instant activation</span>
                        </div>
                      )}
                      {activationType === 'review_required' && (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-amber-500 mr-2" />
                          <span>Admin review required</span>
                        </div>
                      )}
                      {activationType === 'payment_required' && (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-blue-500 mr-2" />
                          <span>Payment required</span>
                        </div>
                      )}
                      {activationType === 'review_then_payment' && (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-purple-500 mr-2" />
                          <span>Admin review followed by payment</span>
                        </div>
                      )}
                      {activationType === 'form_required' && (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-indigo-500 mr-2" />
                          <span>Application form required</span>
                        </div>
                      )}
                      {activationType === 'form_then_payment' && (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-indigo-500 mr-2" />
                          <span>Application form followed by payment</span>
                        </div>
                      )}
                      {activationType === 'form_then_review' && (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-indigo-500 mr-2" />
                          <span>Application form followed by admin review</span>
                        </div>
                      )}
                      {activationType === 'form_then_payment_then_review' && (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-indigo-500 mr-2" />
                          <span>Application form, payment, and admin review required</span>
                        </div>
                      )}
                      {activationType === 'form_then_review_then_payment' && (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-indigo-500 mr-2" />
                          <span>Application form, admin review, and payment required</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-6">
                <Button
                  className={`w-full ${isRecommended ? 'bg-primary hover:bg-primary/90' : ''}`}
                  onClick={() => handleSubmit(tier)}
                  disabled={isPending}
                  size={isRecommended ? "lg" : "default"}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {tier.price === 0 ? "Join Now" : "Apply Now"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 