'use client';

import { useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { findUserByEmail } from '@/actions/find-user.action';
import { addOrInviteMember } from '@/actions/member.actions'; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, UserCheck, UserPlus, MailWarning } from 'lucide-react';
import { useUser } from '@/lib/context/UserContext';

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

function AddUserSubmitButton({ 
  isExistingUser, 
  isPending 
}: { 
  isExistingUser: boolean; 
  isPending: boolean; 
}) {
  return (
    <Button type="submit" disabled={isPending} className="w-full">
       {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isExistingUser ? <UserCheck className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />)}
      {isPending ? (isExistingUser ? 'Adding...' : 'Inviting...') : (isExistingUser ? 'Add Member' : 'Invite Member')}
    </Button>
  );
}

// --- Main Component --- 
export function InviteMemberFormContent({ orgId, orgSlug, closeModal }: InviteMemberFormContentProps) {
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const [findUserState, setFindUserState] = useState<FindUserState>({ status: 'idle' });
  const [addUserState, setAddUserState] = useState<AddUserState>({});
  const [isCheckingEmail, startEmailCheckTransition] = useTransition();
  const [isAddingMember, startAddMemberTransition] = useTransition();
  const [emailToCheck, setEmailToCheck] = useState('');

  useEffect(() => {
    if (addUserState?.error) {
      toast({ title: "Error", description: addUserState.error, variant: "destructive" });
      setAddUserState({});
    } else if (addUserState?.success) {
      toast({ title: "Success", description: "Member added/invited successfully. They need to accept the invitation if new." });
      closeModal();
    }
  }, [addUserState, toast, closeModal]);

  const triggerEmailCheck = async (event: React.FormEvent<HTMLFormElement>) => {
     event.preventDefault();
     const formData = new FormData(event.currentTarget);
     startEmailCheckTransition(async () => {
       setFindUserState({ status: 'checking' });
       const result = await findUserByEmail({}, formData);
       if (result.status === 'not_found') {
         setFindUserState({ status: 'not_found', email: formData.get('email') as string });
       } else {
         setFindUserState(result);
       }
     });
  };

  const handleAddOrInviteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // Remove the console log and the frontend check for currentUser
    // console.log('Current User in handleAddOrInviteSubmit:', currentUser);
    
    // The check for currentUser will now be handled within the server action
    // if (!currentUser) {
    //   toast({ variant: "destructive", title: "Error", description: "You must be logged in to add/invite members." });
    //   return;
    // }

    startAddMemberTransition(async () => {
      // Ensure currentUser exists before accessing its id for context
      // Although the primary check is moved, add a safety check here before creating context
      if (!currentUser) {
        console.error('handleAddOrInviteSubmit: currentUser unexpectedly null before creating context.');
        setAddUserState({ error: "Authentication context is missing. Please ensure you are logged in." });
        return; // Stop if user is null before creating context
      }
      
      try {
        // Call the action correctly: (currentState, params)
        // Pass null for currentState, and { formData } for params
        const result = await addOrInviteMember(null, { formData });
        setAddUserState(result);
      } catch (error: any) {
        console.error("Add/Invite Submit Error:", error);
        setAddUserState({ error: error.message || "An unexpected error occurred." });
      }
    });
  };

  return (
    <div>
      {/* --- Step 1: Email Input --- */}
      {(findUserState.status === 'idle' || findUserState.status === 'checking' || (findUserState.status === 'error' && findUserState.error === 'Email is required.')) && (
        <form onSubmit={triggerEmailCheck} className="space-y-4">
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

          {findUserState.isMember ? (
            <Alert variant="default">
              <UserCheck className="h-4 w-4" />
              <AlertTitle>Already a Member</AlertTitle>
              <AlertDescription>
                This user is already a member of this organization.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleAddOrInviteSubmit} className="space-y-4">
              <input type="hidden" name="orgId" value={orgId} />
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <input type="hidden" name="email" value={findUserState.profile.email} />
              <p className="text-sm text-muted-foreground">
                 This user already has an account. Adding them will send an invitation to join the organization.
              </p>
              <AddUserSubmitButton isExistingUser={true} isPending={isAddingMember} />
            </form>
          )}
          <Button variant="outline" onClick={() => setFindUserState({ status: 'idle' })} className="w-full">Cancel</Button>
        </div>
      )}

      {/* --- Step 3: Invite New User --- */}
      {findUserState.status === 'not_found' && (
        <div className="space-y-4">
          <Alert>
            <MailWarning className="h-4 w-4" />
            <AlertTitle>Account Not Found</AlertTitle>
            <AlertDescription>
              No existing account found for <span className="font-medium">{findUserState.email}</span>. An invitation email will be sent.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleAddOrInviteSubmit} className="space-y-4">
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="email" value={findUserState.email} />
            
            {/* Optional Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name <span className="text-muted-foreground">(Optional)</span></Label>
                <Input id="firstName" name="firstName" placeholder="Jane" />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name <span className="text-muted-foreground">(Optional)</span></Label>
                <Input id="lastName" name="lastName" placeholder="Doe" />
              </div>
            </div>
            
            {/* NEW: Optional Member ID */}
            <div>
              <Label htmlFor="memberId">Member ID <span className="text-muted-foreground">(Optional)</span></Label>
              <Input 
                id="memberId" 
                name="memberId" 
                placeholder="e.g., MEM-2025-001" 
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                If left blank, an ID may be generated later when a membership is assigned.
              </p>
            </div>

            <AddUserSubmitButton isExistingUser={false} isPending={isAddingMember} />
          </form>
        </div>
      )}
    </div>
  );
} 