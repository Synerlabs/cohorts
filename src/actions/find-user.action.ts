'use server';

import { createClient, createServiceRoleClient } from "@/lib/utils/supabase/server";
import { withPermissions } from '@/lib/utils/action-permissions';
import { permissions } from '@/lib/types/permissions';

// Define specific result types for clarity
interface UserFoundResult {
  status: 'found';
  profile: {
    id: string;
    email: string; // Include email in response
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  isMember?: boolean; // Added flag
}

interface UserNotFoundResult {
  status: 'not_found';
}

interface FindUserErrorResult {
  status: 'error';
  error: string;
}

type FindUserResult = UserFoundResult | UserNotFoundResult | FindUserErrorResult;

// Action to find user by email - requires permission to view members
export async function findUserByEmail(
    prevState: any, // Not used, but required by potential useFormState later?
    formData: FormData
): Promise<FindUserResult> {

    const handler = await withPermissions(
        async (context: { userId: string; groupId: string }, params: { formData: FormData }) => {
            const email = params.formData.get('email') as string;
            const orgId = context.groupId; // Get groupId from context
            if (!email) {
                return { status: 'error', error: 'Email is required.' };
            }
            
            // Use Service Role Client for the RPC call to the security definer function
            const supabaseService = await createServiceRoleClient(); 
            let authUserId: string | null = null;

            try {
                // Call the database function using the service client
                const { data: userIdResult, error: rpcError } = await supabaseService
                    .rpc('search_auth_user_by_email', { email_param: email });

                if (rpcError) {
                    console.error("findUserByEmail (RPC call - service role) Error:", rpcError);
                    return { status: 'error', error: 'Database error during user lookup via RPC.' };
                }
                
                authUserId = userIdResult as string | null; 

            } catch (error: any) {
                 console.error("findUserByEmail (RPC call - service role) Catch Error:", error);
                 return { status: 'error', error: error.message || 'An unexpected error occurred during RPC lookup.' };
            }

            if (!authUserId) {
                 return { status: 'not_found' };
            }

            // Found user ID via RPC, use REGULAR client for profile lookup (respects RLS)
            const supabase = await createClient();
            let userProfile: any = null;
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, avatar_url')
                    .eq('id', authUserId)
                    .single(); 
                
                if (profileError || !profile) {
                    console.error("findUserByEmail (profile lookup) Error:", profileError);
                    return { status: 'error', error: 'User account exists but profile data is missing or inaccessible.' };
                }
                userProfile = profile;

            } catch (error: any) {
                console.error("findUserByEmail (profile lookup) Catch Error:", error);
                return { status: 'error', error: error.message || 'An unexpected error occurred during profile lookup.' };
            }
            
            // Check if user is already a member of this group (using regular client)
            let isAlreadyMember = false;
            try {
                // Use select without count/head, check if data array has elements
                const { data: membership, error: membershipError } = await supabase
                    .from('group_users')
                    .select('id') // Select a minimal column
                    .eq('user_id', authUserId)
                    .eq('group_id', orgId)
                    .limit(1); // Only need to know if at least one exists

                if (membershipError) {
                     console.error("findUserByEmail (membership check) Error:", membershipError);
                     return { status: 'error', error: 'Could not verify existing membership.' };
                }
                // Check if the returned array is not null and has length > 0
                isAlreadyMember = !!membership && membership.length > 0;
                
            } catch (error: any) {
                 console.error("findUserByEmail (membership check) Catch Error:", error);
                 return { status: 'error', error: error.message || 'An unexpected error occurred during membership check.' };
            }

            // Return result
            return {
                status: 'found',
                profile: {
                    id: userProfile.id,
                    email: email, 
                    firstName: userProfile.first_name,
                    lastName: userProfile.last_name,
                    avatarUrl: userProfile.avatar_url
                },
                isMember: isAlreadyMember // Include membership status
            };
        },
        // Define permissions required for this lookup
        (params: { formData: FormData }) => {
            const orgId = params.formData.get('orgId') as string; // Need orgId to check context
            if (!orgId) {
              throw new Error("Organization ID is required for permission check.");
            }
            return {
                groupId: orgId,
                moduleType: 'group',
                requiredPermissions: [permissions.members.view] // Requires view permission
            };
        }
    );
    
    const orgId = formData.get('orgId') as string;
    if (!orgId) {
        return { status: 'error', error: 'Organization ID missing from form data.' };
    }

    try {
      // Call the handler. Its return type might be ActionResult<unknown> or FindUserResult
      const result: any = await handler(prevState, { formData }); 

      // Check if the result is an error from withPermissions itself (lacks 'status')
      if (result && typeof result === 'object' && 'error' in result && !('status' in result)) {
        // Format it into our expected error shape
        return { status: 'error', error: String(result.error || 'Permission check failed or internal error') };
      } 
      
      // Otherwise, assume it's a valid FindUserResult (or potentially null/undefined if action had no return)
      // We might need validation here depending on how robust we want to be
      if (result && typeof result === 'object' && 'status' in result) {
        return result as FindUserResult; // Cast to our expected type
      }

      // Fallback error if the result is unexpected
      console.error("findUserByEmail: Unexpected result shape from handler:", result);
      return { status: 'error', error: 'Unexpected response from action handler.' };

    } catch (error: any) {
        // Catch errors thrown by the handler/withPermissions
        console.error("findUserByEmail handler Error:", error);
        return { status: 'error', error: error.message || "Permission check failed" };
    }
} 