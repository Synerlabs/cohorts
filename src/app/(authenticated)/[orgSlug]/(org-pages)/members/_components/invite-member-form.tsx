'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { addOrInviteMember } from '@/actions/member.actions'; // Adjust path if necessary
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useRef } from 'react';
// Import a toast library if you use one (e.g., react-toastify, sonner)
import { useToast } from '@/components/ui/use-toast'; // Assuming shadcn/ui toast

// Updated initial state to match new ActionResult (success optional, error optional)
const initialState: { success?: boolean; error?: string } = {};

interface InviteMemberFormProps {
  orgId: string;
  orgSlug: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm"> {/* Added size="sm" */}
      {pending ? 'Sending Invite...' : 'Send Invite'}
    </Button>
  );
}

export function InviteMemberForm({ orgId, orgSlug }: InviteMemberFormProps) {
  const [state, formAction] = useFormState(addOrInviteMember, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Check if there is an error message to display
    if (state?.error) {
      toast({
        title: "Info", // Use a more neutral title as error might contain non-errors like "already exists"
        description: state.error,
        // Only make it destructive if success is explicitly false or missing (indicating a true error)
        variant: state.success === false || state.success === undefined ? "destructive" : "default", 
      });
    } 
    // Check for explicit success flag
    else if (state?.success === true) {
      toast({
        title: "Success",
        description: "Invitation sent successfully.", // Provide a generic success message
      });
      formRef.current?.reset(); // Reset form on success
    }
    // Note: This doesn't explicitly handle the case where state might be reset to initial {} 
    // without success or error, but that shouldn't happen with useFormState typically.
  }, [state, toast]);

  return (
    <form ref={formRef} action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <div className="grid items-center gap-1.5">
        <Label htmlFor="email" className="sr-only">Email address</Label>
        <Input 
          type="email" 
          id="email" 
          name="email" 
          placeholder="member@example.com" 
          required 
          className="h-9"
        />
      </div>
      <SubmitButton />
    </form>
  );
} 