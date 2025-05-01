'use client';

import { useEffect, useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { findUserByEmail } from '@/actions/find-user.action';
import { addOrInviteMember } from '@/actions/member.actions'; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, UserCheck, UserPlus, MailWarning } from 'lucide-react';

// --- State types for findUserByEmail --- 
interface UserProfile {
  id: string;
  email: string; 
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}
interface UserFoundState {
  status: 'found';
  profile: UserProfile;
  isMember?: boolean; 
}
interface UserNotFoundState {
  status: 'not_found';
  email: string; // Keep track of the email searched
}
interface FindUserErrorState {
  status: 'error';
  error: string;
}
type FindUserState = UserFoundState | UserNotFoundState | FindUserErrorState | { status: 'idle' } | { status: 'checking' };

// --- State type for addOrInviteMember --- 
interface AddUserState {
  success?: boolean;
  error?: string;
}

interface InviteMemberFormContentProps {
  orgId: string;
  orgSlug: string;
  closeModal: () => void;
}

// Helper to get initials
const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || '?';
};

// --- Sub Components --- 
function FindUserSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Checking...' : 'Check Email'}
    </Button>
  );
}

function AddUserSubmitButton({ isExistingUser }: { isExistingUser: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
       {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isExistingUser ? <UserCheck className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />)}
      {pending ? (isExistingUser ? 'Adding...' : 'Inviting...') : (isExistingUser ? 'Add Member' : 'Invite Member')}
    </Button>
  );
}

// --- Main Component --- 
export function InviteMemberFormContent({ orgId, orgSlug, closeModal }: InviteMemberFormContentProps) {
  const { toast } = useToast();
  const [findUserState, setFindUserState] = useState<FindUserState>({ status: 'idle' });
  const [addUserState, addUserAction] = useFormState<AddUserState, FormData>(addOrInviteMember, {});
  const [isChecking, startCheckingTransition] = useTransition();
  const [emailToCheck, setEmailToCheck] = useState('');

  // Effect to handle result from addOrInviteMember action
  useEffect(() => {
    if (addUserState?.error) {
      toast({ title: "Error", description: addUserState.error, variant: "destructive" });
    } else if (addUserState?.success) {
      toast({ title: "Success", description: "Member added/invited successfully. They need to accept the invitation if new." });
      closeModal();
    }
  }, [addUserState, toast, closeModal]);

  // Renamed handleFindUserSubmit to triggerEmailCheck and adjusted logic
  const triggerEmailCheck = async (event: React.FormEvent<HTMLFormElement>) => {
     event.preventDefault(); // Prevent default form submission
     const formData = new FormData(event.currentTarget); // Get form data

     startCheckingTransition(async () => {
       setFindUserState({ status: 'checking' });
       // Manually call the server action
       const result = await findUserByEmail({}, formData); 
       if (result.status === 'not_found') {
         setFindUserState({ status: 'not_found', email: formData.get('email') as string });
       } else {
         setFindUserState(result);
       }
     });
  };

  return (
    <div>
      {/* --- Step 1: Email Input --- */}
      {(findUserState.status === 'idle' || findUserState.status === 'checking' || (findUserState.status === 'error' && findUserState.error === 'Email is required.')) && (
        <form onSubmit={triggerEmailCheck} className="space-y-4">
          {/* Hidden fields needed by findUserByEmail */}
          <input type="hidden" name="orgId" value={orgId} />
          <div>
            <Label htmlFor="email-check">Member Email Address</Label>
            <Input 
              id="email-check" 
              name="email" 
              type="email" 
              placeholder="member@example.com" 
              required 
              value={emailToCheck}
              onChange={(e) => setEmailToCheck(e.target.value)}
            />
             {findUserState.status === 'error' && findUserState.error !== 'Email is required.' && (
                <p className="text-sm text-destructive mt-1">{findUserState.error}</p>
             )}
          </div>
          <FindUserSubmitButton />
        </form>
      )}

      {/* --- Step 2: User Found --- */}
      {findUserState.status === 'found' && (
        <div className="space-y-4">
          <Alert>
            <UserCheck className="h-4 w-4" />
            <AlertTitle>Account Found</AlertTitle>
            <AlertDescription className="flex items-center gap-3 mt-2">
              <Avatar>
                <AvatarImage src={findUserState.profile.avatarUrl || undefined} />
                <AvatarFallback>{getInitials(findUserState.profile.firstName, findUserState.profile.lastName)}</AvatarFallback>
              </Avatar>
              <div>
                 <p className="font-medium">
                    {findUserState.profile.firstName || findUserState.profile.lastName 
                       ? `${findUserState.profile.firstName || ''} ${findUserState.profile.lastName || ''}`.trim()
                       : 'User Profile'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">{findUserState.profile.email}</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* --- Conditional Action/Message based on isMember --- */}
          {findUserState.isMember ? (
            <Alert variant="default">
              <UserCheck className="h-4 w-4" />
              <AlertTitle>Already a Member</AlertTitle>
              <AlertDescription>
                This user is already a member of this organization.
              </AlertDescription>
            </Alert>
          ) : (
            <form action={addUserAction} className="space-y-4">
              <input type="hidden" name="orgId" value={orgId} />
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <input type="hidden" name="email" value={findUserState.profile.email} />
              <p className="text-sm text-muted-foreground">
                 This user already has an account. Adding them will send an invitation to join the organization.
              </p>
              <AddUserSubmitButton isExistingUser={true} />
            </form>
          )}
          <Button variant="outline" onClick={() => setFindUserState({ status: 'idle' })} className="w-full">Cancel</Button>
        </div>
      )}

      {/* --- Step 3: User Not Found --- */}
      {findUserState.status === 'not_found' && (
        <form action={addUserAction} className="space-y-4">
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="email" value={findUserState.email} />
          
          <Alert>
              <MailWarning className="h-4 w-4" />
              <AlertTitle>Account Not Found</AlertTitle>
              <AlertDescription>
                No existing account found for {findUserState.email}. An invitation will be sent to this address. You can optionally provide their name.
              </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name (Optional)</Label>
              <Input id="firstName" name="firstName" placeholder="Jane" />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name (Optional)</Label>
              <Input id="lastName" name="lastName" placeholder="Doe" />
            </div>
          </div>
          <AddUserSubmitButton isExistingUser={false} />
           <Button variant="outline" onClick={() => setFindUserState({ status: 'idle' })} className="w-full">Cancel</Button>
        </form>
      )}
    </div>
  );
} 