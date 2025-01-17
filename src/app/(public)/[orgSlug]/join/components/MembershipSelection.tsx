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
import { useState, useTransition } from "react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { joinOrgWithMembership } from "../_actions/join";
import { Membership } from "@/lib/types/membership";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface MembershipSelectionProps {
  memberships: Membership[];
  groupId: string;
  userId: string;
}

export function MembershipSelection({ memberships, groupId, userId }: MembershipSelectionProps) {
  const [isPending, startTransition] = useTransition();
  const [state, action] = useToastActionState(joinOrgWithMembership);

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

  const handleSubmit = (membershipId: string) => {
    const formData = new FormData();
    formData.set('membershipId', membershipId);
    formData.set('groupId', groupId);
    formData.set('userId', userId);

    startTransition(() => {
      action(formData);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Select a Membership</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Choose a membership type to join the organization.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {memberships.map((membership) => (
          <Card key={membership.id}>
            <CardHeader>
              <CardTitle>{membership.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold">
                  {membership.price === 0 ? 'Free' : `$${membership.price}`}
                </p>
                {membership.duration_months > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {membership.duration_months} month{membership.duration_months !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <Button
                className="w-full"
                onClick={() => handleSubmit(membership.id)}
                disabled={isPending}
              >
                {isPending ? 'Processing...' : 'Select'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 