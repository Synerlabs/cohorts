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
import { Loader2 } from "lucide-react";
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
      <Card>
        <CardHeader>
          <CardTitle>No Memberships Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p>There are no memberships available at this time.</p>
        </CardContent>
      </Card>
    );
  }

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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {memberships.map((tier) => (
        <Card key={tier.id} className="flex flex-col">
          <CardHeader>
            <CardTitle>{tier.name}</CardTitle>
            {tier.description && (
              <CardDescription>{tier.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-bold">
                  {tier.price === 0 ? (
                    "Free"
                  ) : (
                    <>
                      {currencySymbols[tier.currency as Currency]}
                      {(tier.price / 100).toFixed(2)}
                    </>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {tier.membership_tier?.duration_months === 1
                    ? "per month"
                    : `for ${tier.membership_tier?.duration_months} months`}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Activation Process</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  {tier.membership_tier?.activation_type === 'automatic' && (
                    <li>Instant activation</li>
                  )}
                  {tier.membership_tier?.activation_type === 'review_required' && (
                    <li>Admin review required</li>
                  )}
                  {tier.membership_tier?.activation_type === 'payment_required' && (
                    <li>Payment required</li>
                  )}
                  {tier.membership_tier?.activation_type === 'review_then_payment' && (
                    <li>Admin review followed by payment</li>
                  )}
                  {tier.membership_tier?.activation_type === 'form_required' && (
                    <li>Application form required</li>
                  )}
                  {tier.membership_tier?.activation_type === 'form_then_payment' && (
                    <li>Application form followed by payment</li>
                  )}
                  {tier.membership_tier?.activation_type === 'form_then_review' && (
                    <li>Application form followed by admin review</li>
                  )}
                  {tier.membership_tier?.activation_type === 'form_then_payment_then_review' && (
                    <li>Application form, payment, and admin review required</li>
                  )}
                  {tier.membership_tier?.activation_type === 'form_then_review_then_payment' && (
                    <li>Application form, admin review, and payment required</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => handleSubmit(tier)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {tier.price === 0 ? "Join Now" : "Apply Now"}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 