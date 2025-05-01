"use server";

import { revalidatePath } from 'next/cache';
import { createClient as createServerClient, createServiceRoleClient } from '@/lib/utils/supabase/server';
import { permissions } from '@/lib/types/permissions';
import { Tables } from '@/lib/types/database.types';

interface ActionResult {
  success?: boolean;
  error?: string;
}

// Assuming createServerClient() can create admin client based on env vars
// If not, we might need a dedicated admin client creator function

// Define context for add/invite action
interface AddOrInviteMemberContext {
  userId: string; // ID of user performing action
  groupId: string; // ID of the target group (orgId)
}

// Refactor addOrInviteMember to be a direct export
export async function addOrInviteMember(
  context: AddOrInviteMemberContext, // Expect context from caller
  formData: FormData
): Promise<ActionResult> { 
  // \"use server\" handled by top-level directive

  const email = formData.get('email') as string;
  const orgSlug = formData.get('orgSlug') as string;
  const firstName = formData.get('firstName') as string || undefined;
  const lastName = formData.get('lastName') as string || undefined;
  const orgId = context.groupId; // Get orgId from context

  const supabaseService = await createServiceRoleClient();

  if (!email || !orgId) {
    return { error: 'Internal error: Missing email or organization ID provided in context.' };
  }
  
  if (!orgSlug) {
      // orgSlug is needed for revalidation
      return { error: 'Internal error: Missing orgSlug in form data.' };
  }

  // Prepare optional metadata for invite
  const inviteMetadata = {
    first_name: firstName,
    last_name: lastName
  };

  // Construct the redirect URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.error('NEXT_PUBLIC_SITE_URL environment variable is not set. Cannot create specific redirect URL for invite.');
    // Decide if we should proceed without redirectTo or return an error
    // Proceeding without it means Supabase uses default redirect (likely Site URL from settings)
    // return { error: "Application configuration error: Site URL not set." }; 
  }
  const redirectUrl = siteUrl ? `${siteUrl}/@${orgSlug}` : undefined;
  console.log(`Invite redirectTo URL: ${redirectUrl}`); // Log for debugging

  try {
    // 1. Find or Invite User - Determine userIdToAdd
    let userIdToAdd: string | null = null;
    let isNewInvite = false;
    
    // Call inviteUserByEmail first, including redirectTo
    const { data: inviteResponse, error: inviteError } = await supabaseService.auth.admin.inviteUserByEmail(
      email,
      { 
        data: inviteMetadata, 
        redirectTo: redirectUrl // Add the redirect URL here
      }
    );
    const inviteData = inviteResponse as ({ user: { id: string; [key: string]: any; } | null; [key: string]: any; }) | null;

    if (inviteError) {
      if (inviteError.message.includes('already registered')) {
        // If already registered, try to get the user ID from the (potentially null) response data
        // If that fails, we might need an RPC call like findUserByEmail used
        userIdToAdd = inviteData?.user?.id || null;
        if (!userIdToAdd) {
          // Fallback: Use RPC to get user ID if invite response didn't provide it
          console.warn('Invite error for existing user did not return ID, using RPC fallback');
          const { data: rpcUserId, error: rpcError } = await supabaseService
            .rpc('search_auth_user_by_email', { email_param: email });
          if (rpcError || !rpcUserId) {
            console.error('RPC fallback failed:', rpcError);
            return { error: 'Failed to retrieve existing user ID after invite attempt.' };
          }
          userIdToAdd = rpcUserId as string;
        }
        isNewInvite = false;
      } else {
        return { error: inviteError.message || 'Failed to invite user.' };
      }
    } else {
      userIdToAdd = inviteData?.user?.id || null;
      if (!userIdToAdd) return { error: 'Invited user data not returned from Supabase.' };
      isNewInvite = true;
    }

    if (!userIdToAdd) return { error: 'Internal error: Could not determine user ID.' };

    // 2. Check existing group_users record status (active, deleted, or none)
    const { data: existingMembership, error: checkError } = await supabaseService
        .from('group_users')
        .select('id, is_active, is_deleted') // Select flags
        .eq('user_id', userIdToAdd)
        .eq('group_id', orgId)
        .maybeSingle(); // Expect 0 or 1 row

    if (checkError) {
        console.error("Error checking membership status:", checkError);
        return { error: checkError.message || 'Error checking existing membership status.' }; 
    }

    // 3. Handle based on existing record status
    if (existingMembership) {
        if (!existingMembership.is_deleted) {
            // Scenario 1: Already an active or pending member
            return { error: 'User is already an active or pending member of this organization.' }; 
        } else {
            // Scenario 2: Member exists but is deleted - Restore them
            console.log(`Restoring deleted member ${userIdToAdd} in group ${orgId}`);
            const { error: restoreError } = await supabaseService
                .from('group_users')
                .update({ 
                    is_deleted: false, 
                    is_active: true // Reactivate upon restore
                })
                .eq('id', existingMembership.id); // Update by the specific group_users id

            if (restoreError) {
                console.error("Error restoring member:", restoreError);
                return { error: restoreError.message || 'Failed to restore member.' };
            }
        }
    } else {
        // Scenario 3: No existing record - Add new pending member
        console.log(`Adding user ${userIdToAdd} to group ${orgId} as new pending member`);
        const { error: insertError } = await supabaseService
            .from('group_users')
            .insert({ 
                user_id: userIdToAdd, 
                group_id: orgId, 
                is_active: false, // Start as inactive (pending)
                is_deleted: false 
            });

        if (insertError) { 
             console.error("Error inserting new member:", insertError);
            return { error: insertError.message || 'Failed to add user to organization group.' };
        }
    }

    // 4. Revalidate and return success (applies to restore or new add)
    revalidatePath(`/@${orgSlug}/members`);
    return { success: true };

  } catch (error: any) {
    console.error('Add/Invite Member Core Logic Error:', error);
    return { error: error.message || 'An unexpected error occurred during processing.' };
  }
}

// Context now needs to be provided by the caller
interface RemoveMemberContext {
  userId: string; // ID of the user performing the action (can be retrieved server-side if needed)
  groupId: string; // ID of the group (orgId)
}

// Export the core action logic directly
export async function removeMemberAction(context: RemoveMemberContext, formData: FormData) {
  // "use server" is handled by the top-level directive

  const groupUsersId = formData.get('groupUsersId') as string;

  if (!groupUsersId) {
    return { error: 'Member ID (groupUsersId) is missing.' };
  }
  
  // Basic check: Ensure context contains necessary IDs (though caller should validate)
  if (!context || !context.groupId) {
      return { error: 'Action context (groupId) is missing.' };
  }

  const supabase = await createServiceRoleClient();

  // Fetch the group slug for revalidation
  const { data: group, error: groupError } = await supabase
    .from('group')
    .select('slug')
    .eq('id', context.groupId)
    .single();

  if (groupError || !group?.slug) {
    console.error('Error fetching group slug for revalidation:', groupError);
    return { error: 'Could not find group details for revalidation.' };
  }

  // Perform the update - set is_deleted to true
  const { error: updateError } = await supabase
    .from('group_users')
    .update({ is_deleted: true }) // Set is_deleted to true
    .eq('id', groupUsersId);

  if (updateError) {
    console.error('Error logically deleting member:', updateError);
    return { error: `Failed to remove member: ${updateError.message}` };
  }

  revalidatePath(`/@${group.slug}/members`); 

  return { success: true };
}

// Context for resend action
interface ResendInviteContext {
  userId: string; 
  groupId: string;
}

// Action to resend an invitation (now sends a Magic Link)
export async function resendInviteAction(context: ResendInviteContext, formData: FormData) {
  const groupUsersId = formData.get('groupUsersId') as string;
  const email = formData.get('email') as string;

  if (!groupUsersId || !email) {
    return { error: 'Missing member details (ID or Email) for resend.' };
  }
  if (!context || !context.groupId) {
      return { error: 'Action context (groupId) is missing.' };
  }

  const supabaseService = await createServiceRoleClient();

  try {
    // 1. Verify the current status of the member
    const { data: memberStatus, error: statusError } = await supabaseService
      .from('group_users')
      .select('is_active, is_deleted')
      .eq('id', groupUsersId)
      .eq('group_id', context.groupId)
      .single();

    if (statusError) {
      console.error("Error fetching member status for resend:", statusError);
      return { error: 'Could not verify member status.' };
    }

    if (memberStatus.is_deleted) {
      return { error: 'Cannot resend invite to a deleted member.' };
    }
    if (memberStatus.is_active) {
      return { error: 'Member is already active.' };
    }

    // 2. If pending, send a Magic Link email via Supabase Auth
    console.log(`Sending Magic Link for pending member: ${email}`);

    // Construct the FINAL destination URL (org page)
    const orgSlug = formData.get('orgSlug') as string;
    if (!orgSlug) {
      return { error: "Internal error: Missing orgSlug for redirect URL." };
    }
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL;
    const finalRedirectPath = `/@${orgSlug}`;
    const callbackUrlBase = siteUrl ? `${siteUrl}/auth/callback` : null;

    if (!callbackUrlBase) {
      console.error("Cannot generate callback URL: NEXT_PUBLIC_APP_URL not set.");
      return { error: "Configuration error: Cannot construct callback URL." };
    }

    // The URL Supabase will redirect *to* after clicking the magic link.
    // We include the final destination as the 'next' parameter.
    const emailRedirectToUrl = `${callbackUrlBase}?next=${encodeURIComponent(finalRedirectPath)}`;
    console.log(`[resendInviteAction] emailRedirectToUrl: '${emailRedirectToUrl}'`);

    const { error: magicLinkError } = await supabaseService.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: emailRedirectToUrl // Point to the callback route
      }
    });

    if (magicLinkError) {
      console.error("Error sending magic link:", magicLinkError);
      return { error: `Failed to send login link: ${magicLinkError.message}` };
    }

    // Note: signInWithOtp doesn't throw error if user DNE with shouldCreateUser: false
    // It just doesn't send an email. Our previous checks should ensure user exists.

    return { success: true }; // Success means the attempt to send was made

  } catch (error: any) {
    console.error("Resend Invite Action Error:", error);
    return { error: error.message || 'An unexpected error occurred while resending the invite.' };
  }
}

/**
 * Activates any pending memberships for a given user.
 * Should be called after a user successfully logs in or confirms their account.
 * @param userId The ID of the user whose memberships should be activated.
 */
export async function activatePendingMemberships(userId: string): Promise<{ success?: boolean; error?: string }> {
  if (!userId) {
    return { error: "User ID is required." };
  }

  console.log(`Attempting to activate pending memberships for user: ${userId}`);
  
  // Use service role client for potentially broad updates across groups
  const supabase = await createServiceRoleClient(); 

  try {
    const { data, error } = await supabase
      .from('group_users')
      .update({ is_active: true })
      .match({ 
        user_id: userId, 
        is_active: false, 
        is_deleted: false 
      });

    if (error) {
      console.error("Error activating pending memberships:", error);
      return { error: `Failed to activate memberships: ${error.message}` };
    }

    // `data` might be null or an array of updated records depending on `Prefer` header, 
    // but we mostly care that there was no error.
    console.log(`Activated pending memberships check complete for user: ${userId}. Result data:`, data);

    return { success: true };

  } catch (error: any) {
    console.error("Activate Pending Memberships Action Error:", error);
    return { error: error.message || 'An unexpected error occurred while activating memberships.' };
  }
} 