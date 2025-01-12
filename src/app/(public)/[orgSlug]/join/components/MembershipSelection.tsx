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
import { useState } from "react";
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
  const [joining, setJoining] = useState(false);

  const handleJoin = async (membershipId: string) => {
    setJoining(true);
    try {
      await joinOrgWithMembership({
        groupId: org.id,
        userId,
        membershipId
      });
    } finally {
      setJoining(false);
    }
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
              <Button 
                className="w-full"
                onClick={() => handleJoin(membership.id)}
                disabled={joining}
              >
                {joining ? 'Processing...' : 'Select Plan'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
} 