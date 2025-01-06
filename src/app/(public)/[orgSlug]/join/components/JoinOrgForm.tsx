"use client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useActionState } from "react";
import { joinGroupAction } from "@/app/(public)/[orgSlug]/join/actions/join.action";

type JoinOrgFormProps = {
  org: {
    id: string;
    name: string;
  };
  userId: string;
}

export function JoinOrgForm({ org, userId }: JoinOrgFormProps) {
  const [state, join, pending] = useActionState(joinGroupAction, null);

  const handleJoinOrg = async () => {
    const formData = new FormData();
    formData.append("groupId", org.id);
    formData.append("userId", userId);
    
    await join(formData);
  };

  return (
    <Card className="w-[369px]">
      <CardHeader>
        <CardTitle className="text-xl">Join {org.name}</CardTitle>
        <CardDescription>
          Click below to join this organization
        </CardDescription>
        {state?.error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <Button 
          onClick={handleJoinOrg} 
          disabled={pending}
          className="w-full mt-4"
        >
          {pending ? "Joining..." : "Join Organization"}
        </Button>
      </CardHeader>
    </Card>
  );
} 