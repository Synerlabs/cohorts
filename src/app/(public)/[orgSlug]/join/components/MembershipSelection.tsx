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
import { useActionState } from "react";
import { joinOrgWithMembership } from "../_actions/join";

interface MembershipSelectionProps {
  org: {
    id: string;
    name: string;
  };
  userId: string;
  memberships: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    interval: string;
  }[];
}

export function MembershipSelection({ org, userId, memberships }: MembershipSelectionProps) {
  const [selectedMembership, setSelectedMembership] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [state, action, pending] = useActionState(joinOrgWithMembership, null);

  const handleJoin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(() => {
        const formData = new FormData(event.currentTarget);
        formData.append('groupId', org.id);
        formData.append('userId', userId);
        console.log(formData);
        action(formData);
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
            <CardContent>
              <div className="text-2xl font-bold">
                ${membership.price}
                <span className="text-sm font-normal text-muted-foreground">
                  /{membership.interval}
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <form onSubmit={handleJoin} className="w-full">
                <input type="hidden" name="membershipId" value={membership.id} />
                <Button 
                  className="w-full"
                  type="submit"
                  disabled={pending}
                >
                  {pending ? 'Processing...' : 'Select Plan'}
                </Button>
              </form>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
} 