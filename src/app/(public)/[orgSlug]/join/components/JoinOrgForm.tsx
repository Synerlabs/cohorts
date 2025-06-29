"use client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { startTransition, useActionState } from "react";
import { joinGroupAction } from "@/app/(public)/[orgSlug]/join/actions/join.action";
import { UserPlus, Loader2 } from "lucide-react";

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
    startTransition(async () => {
      await join(formData);
    });
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-primary/20">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold">Join {org.name}</CardTitle>
        <CardDescription className="text-base">
          Become a member of this organization
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-primary/5 p-4 rounded-lg text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            By joining this organization, you&apos;ll get access to exclusive content, events, and community discussions.
          </p>
          <p className="text-sm font-medium">
            Membership is free and instant!
          </p>
        </div>
        
        {state?.error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleJoinOrg} 
          disabled={pending}
          className="w-full"
          size="lg"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-5 w-5" />
              Join Organization
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 