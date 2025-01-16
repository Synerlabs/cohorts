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
import { MembershipActivationType } from "@/lib/types/membership";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface MembershipSelectionProps {
  org: {
    id: string;
    name: string;
    slug: string;
  };
  userId: string;
  memberships: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    duration_months: number;
    activation_type: MembershipActivationType;
  }[];
}

const activationTypeLabels = {
  [MembershipActivationType.AUTOMATIC]: 'Automatic Activation',
  [MembershipActivationType.REVIEW_REQUIRED]: 'Requires Review',
  [MembershipActivationType.PAYMENT_REQUIRED]: 'Payment Required',
  [MembershipActivationType.REVIEW_THEN_PAYMENT]: 'Review then Payment',
} as const;

const activationTypeDescriptions = {
  [MembershipActivationType.AUTOMATIC]: 'You will become a member immediately',
  [MembershipActivationType.REVIEW_REQUIRED]: 'An admin will review your application',
  [MembershipActivationType.PAYMENT_REQUIRED]: 'Payment required to activate membership',
  [MembershipActivationType.REVIEW_THEN_PAYMENT]: 'Admin approval required before payment',
} as const;

type JoinState = {
  success: boolean;
  message?: string;
  error?: string;
};

export function MembershipSelection({ org, userId, memberships }: MembershipSelectionProps) {
  const [selectedMembership, setSelectedMembership] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [state, action] = useToastActionState<JoinState>(joinOrgWithMembership, { success: false });

  const handleJoin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(() => {
      const formData = new FormData(event.currentTarget);
      formData.append('groupId', org.id);
      formData.append('userId', userId);
      action(formData).then((result) => {
        if (result?.success) {
          const membership = memberships.find(m => m.id === formData.get('membershipId'));
          if (membership?.activation_type === MembershipActivationType.PAYMENT_REQUIRED) {
            router.push(`/@${org.slug}/join/payment?membership=${membership.id}`);
          }
        }
      });
    });
  };

  if (memberships.length === 0) {
    return <div>No memberships available</div>;
  }

  return (
    <div className="grid gap-6 max-w-[1200px]">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose your membership</h2>
        <p className="text-muted-foreground">
          Select a membership plan to join {org.name}
        </p>
        {state?.message && (
          <p className={`mt-2 ${state.success ? 'text-green-600' : 'text-red-600'}`}>
            {state.message}
          </p>
        )}
        {state?.error && (
          <p className="mt-2 text-red-600">
            {state.error}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {memberships.map((membership) => (
          <Card 
            key={membership.id}
            className={`relative cursor-pointer transition-all ${
              selectedMembership === membership.id ? 'border-primary' : ''
            }`}
            onClick={() => setSelectedMembership(membership.id)}
          >
            <CardHeader>
              <CardTitle>{membership.name}</CardTitle>
              <CardDescription>{membership.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold">
                {membership.price === 0 ? (
                  <span>Free</span>
                ) : (
                  <>
                    ${membership.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{membership.duration_months} months
                    </span>
                  </>
                )}
              </div>
              <div>
                <Badge variant="secondary" className="mb-2">
                  {activationTypeLabels[membership.activation_type]}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {activationTypeDescriptions[membership.activation_type]}
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <form onSubmit={handleJoin} className="w-full">
                <input type="hidden" name="membershipId" value={membership.id} />
                <Button 
                  className="w-full"
                  type="submit"
                  disabled={isPending}
                >
                  {isPending ? 'Processing...' : 'Select Plan'}
                </Button>
              </form>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
} 