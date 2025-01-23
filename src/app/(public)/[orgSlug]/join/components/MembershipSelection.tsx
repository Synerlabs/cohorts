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
import { joinOrgWithMembership } from "../_actions/join";
import { IMembershipTierProduct } from "@/lib/types/product";
import { Badge } from "@/components/ui/badge";

interface MembershipSelectionProps {
  memberships: IMembershipTierProduct[];
  groupId: string;
  userId: string;
}

type JoinState = {
  success: boolean;
  message?: string;
  error?: string;
};

export function MembershipSelection({ memberships, groupId, userId }: MembershipSelectionProps) {
  const [isPending, startTransition] = useTransition();
  const [state, action] = useToastActionState<JoinState>(joinOrgWithMembership);

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

  const handleSubmit = async (membershipId: string) => {
    const formData = new FormData();
    formData.set('membershipId', membershipId);
    formData.set('groupId', groupId);
    formData.set('userId', userId);

    startTransition(() => {
      action(formData);
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {memberships.map((membership) => (
        <Card key={membership.id} className="flex flex-col">
          <CardHeader>
            <CardTitle>{membership.name}</CardTitle>
            {membership.membership_tier.duration_months > 0 && (
              <CardDescription>
                {membership.membership_tier.duration_months} month{membership.membership_tier.duration_months !== 1 ? 's' : ''}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-3xl font-bold mb-4">
              {membership.price === 0 ? 'Free' : `$${membership.price / 100}`}
            </p>
            {membership.description && (
              <p className="text-sm text-muted-foreground">{membership.description}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => handleSubmit(membership.id)}
              disabled={isPending}
            >
              {isPending ? 'Processing...' : 'Select'}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 