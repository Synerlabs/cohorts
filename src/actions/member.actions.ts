"use server";

import { revalidatePath } from 'next/cache';
import { createClient as createServerClient, createServiceRoleClient } from '@/lib/utils/supabase/server';
import { permissions } from '@/lib/types/permissions';
import { Tables } from '@/lib/types/database.types';
import { checkUserAccess } from '@/lib/utils/permissions';
import { withPermissions, ActionContext, ActionResult } from '@/lib/utils/action-permissions';
import { MembershipStatus } from "@/lib/types/membership"; // Import the enum

// Define context for add/invite action
interface AddOrInviteMemberContext {
  userId: string; // ID of user performing action
  groupId: string; // ID of the target group (orgId)
}

// Define the core logic separately
async function handleAddOrInviteMember(
  context: { userId: string; groupId: string }, 
  params: { formData: FormData }
): Promise<ActionResult> {
  const formData = params.formData;
  const email = formData.get('email') as string;
  const orgSlug = formData.get('orgSlug') as string;
  const firstName = formData.get('firstName') as string || undefined;
  const lastName = formData.get('lastName') as string || undefined;
  const customMemberId = formData.get('memberId') as string || undefined;
  const orgId = context.groupId;
  const actorUserId = context.userId; // User performing the action

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
  const redirectUrl = siteUrl && orgSlug ? `${siteUrl}/@${orgSlug}` : undefined;

  try {
    // 1. Find or Invite User - Determine userIdToAdd
    let userIdToAdd: string | null = null;
    let isNewInvite = false;
    
    // Call inviteUserByEmail first, including redirectTo
    const { data: inviteResponse, error: inviteError } = await supabaseService.auth.admin.inviteUserByEmail(
      email,
      { 
        data: inviteMetadata, 
        redirectTo: redirectUrl
      }
    );
    const inviteData = inviteResponse as ({ user: { id: string; [key: string]: any; } | null; [key: string]: any; }) | null;

    if (inviteError) {
      if (inviteError.message.includes('already registered')) {
        userIdToAdd = inviteData?.user?.id || null;
        if (!userIdToAdd) {
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

    let groupUserId: string | null = null;
    let wasRestored = false;

    // 2. Check existing group_users record status (active, deleted, or none)
    const { data: existingMembership, error: checkError } = await supabaseService
        .from('group_users')
        .select('id, is_active, is_deleted') // Select flags
        .eq('user_id', userIdToAdd)
        .eq('group_id', orgId)
        .maybeSingle();

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
            const { data: restoredUser, error: restoreError } = await supabaseService
                .from('group_users')
                .update({ 
                    is_deleted: false, 
                    is_active: false // Keep inactive on restore, let activation handle it
                })
                .eq('id', existingMembership.id)
                .select('id') // Select the ID after update
                .single();

            if (restoreError || !restoredUser) {
                console.error("Error restoring member:", restoreError);
                return { error: restoreError?.message || 'Failed to restore member.' };
            }
            groupUserId = restoredUser.id; // Get the ID of the restored record
            wasRestored = true;
        }
    } else {
        // Scenario 3: No existing record - Add new pending member
        console.log(`Adding user ${userIdToAdd} to group ${orgId} as new pending member`);
        const { data: newUser, error: insertError } = await supabaseService
            .from('group_users')
            .insert({ 
                user_id: userIdToAdd, 
                group_id: orgId, 
                is_active: false, // Start as inactive (pending)
                is_deleted: false 
            })
            .select('id') // Select the ID after insert
            .single();

        if (insertError || !newUser) {
             console.error("Error inserting new member:", insertError);
            return { error: insertError?.message || 'Failed to add user to organization group.' };
        }
        groupUserId = newUser.id; // Get the ID of the newly inserted record
    }

    // --- NEW: Handle Custom Member ID --- 
    if (customMemberId && groupUserId) {
      try {
        console.log(`Attempting to insert member_id '${customMemberId}' for group_user_id '${groupUserId}'`);
        // Step 1: Attempt direct insert first
        const { error: insertError } = await supabaseService
          .from('member_ids')
          .insert({
            group_user_id: groupUserId,
            group_id: orgId,
            member_id: customMemberId
          });

        if (insertError) {
          // If insert fails (e.g., duplicate group_user_id), try updating
          console.warn(`Insert failed for member_id (likely exists), attempting update: ${insertError.message}`);
          
          const { error: updateError } = await supabaseService
            .from('member_ids')
            .update({ member_id: customMemberId })
            .eq('group_user_id', groupUserId)
            .eq('group_id', orgId);

          if (updateError) {
            // If update also fails, log the error
            console.error('Error updating custom member_id after insert failed:', updateError);
            // Return a specific error if it looks like a unique constraint violation
            if (updateError.message.includes("member_ids_unique_per_group")) {
              return { success: false, error: `Member ID '${customMemberId}' is already taken in this organization.` };
            }
            // Otherwise, a generic warning that ID wasn't set
            return { success: true, error: "Invite successful, but failed to set custom Member ID due to an update error." };
          } else {
            console.log(`Successfully updated existing member_id for group_user_id ${groupUserId}`);
          }
        } else {
          console.log(`Successfully inserted new member_id for group_user_id ${groupUserId}`);
        }
      } catch (e: any) { // Catch as any to check message
        console.error('Exception during member_id handling:', e);
        // Check if the exception is the unique constraint error
        if (e.message?.includes("member_ids_unique_per_group")) {
           return { success: false, error: `Member ID '${customMemberId}' is already taken in this organization.` };
        }
        return { success: true, error: "Invite successful, but failed to set custom Member ID due to an unexpected error." };
      }
    } else if (customMemberId) {
      console.warn('Custom member ID provided, but could not determine groupUserId. Skipping member ID handling.');
    }
    // --- END NEW --- 

    // 4. Revalidate and return success (applies to restore or new add)
    if (orgSlug) {
      revalidatePath(`/@${orgSlug}/members`);
    } else {
      console.warn('orgSlug missing, cannot revalidate path after add/invite.');
    }
    return { success: true };

  } catch (error: any) {
    console.error('Add/Invite Member Core Logic Error:', error);
    return { error: error.message || 'An unexpected error occurred during processing.' };
  }
}

// Create the wrapped action function using withPermissions, awaiting its result
const protectedAddOrInviteMember = await withPermissions(
  handleAddOrInviteMember, // The actual logic function
  // Function to define the context and permissions needed
  (params: { formData: FormData }): ActionContext => {
    const orgId = params.formData.get('orgId') as string;
    const orgSlug = params.formData.get('orgSlug') as string;
    
    if (!orgId) {
      throw new Error("Organization ID (orgId) is missing from form data.");
    }
    if (!orgSlug) {
      // Throw error here as it's needed for revalidation later
      throw new Error("Organization Slug (orgSlug) is missing from form data.");
    }
    
    return {
      groupId: orgId,
      // Cast 'group' to any if ModuleType is strictly local to action-permissions
      moduleType: 'group' as any, // Or 'members' depending on your permission model
      requiredPermissions: permissions.members.invite, // Specify the required permission
      // allowGuest: false, // Default
      // isCreation: true // This action effectively creates/modifies a group membership
    };
  }
);

// Export an async function that calls the protected action
export async function addOrInviteMember(currentState: any, params: { formData: FormData }): Promise<ActionResult> {
  // The HOC handles the auth check, so we call it directly
  // Note: The HOC expects (currentState, params) signature for useFormState
  return protectedAddOrInviteMember(currentState, params);
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

/**
 * Checks if a specific member ID is already taken within an organization.
 */
export async function checkMemberIdAvailability(
  orgId: string,
  memberId: string
): Promise<{ isAvailable: boolean; error?: string }> {
  // Basic validation
  if (!orgId || !memberId) {
    return { isAvailable: false, error: "Organization ID and Member ID are required." };
  }

  // No auth check needed here - checking availability isn't a protected action itself,
  // but rely on the calling action (like invite) being protected.
  const supabase = await createServiceRoleClient(); 

  try {
    const { count, error } = await supabase
      .from('member_ids')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', orgId)
      .eq('member_id', memberId);

    if (error) {
      console.error("Error checking member ID availability:", error);
      return { isAvailable: false, error: "Database error checking ID availability." };
    }

    return { isAvailable: count === 0 };

  } catch (err: any) {
    console.error("Unexpected error checking member ID:", err);
    return { isAvailable: false, error: "An unexpected error occurred." };
  }
}

/**
 * Updates the member_id for a specific group_user.
 * Accepts FormData compatible with useFormState.
 */
export async function updateGroupUserMemberId(
  currentState: any, // Previous form state (not heavily used here, but part of signature)
  formData: FormData
): Promise<ActionResult<{ updatedId: string }>> {
  const groupUserId = formData.get('groupUserId') as string;
  const newMemberId = formData.get('newMemberId') as string; // Might be an empty string
  const orgId = formData.get('orgId') as string;

  const supabase = await createServerClient(); // Use server client for auth context
  const serviceRoleSupabase = await createServiceRoleClient(); // For operations

  // --- Permission Check ---
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "Authentication failed or user not found." };
  }
  const hasPermission = await checkUserAccess({
    userId: user.id,
    groupId: orgId,
    requiredPermissions: [permissions.memberships.edit], // Define required permission
  });
  if (!hasPermission) {
    return { success: false, error: "You don't have permission to edit member IDs." };
  }
  // --- End Permission Check ---

  // --- Validation ---
  if (!groupUserId) {
    return { success: false, error: "Group User ID is missing from form data." };
  }
  if (!orgId) {
      return { success: false, error: "Organization ID is missing from form data." };
  }
  // newMemberId can be empty string IF the intention is to clear it, but our logic below forbids empty strings.
  if (newMemberId === null || typeof newMemberId !== 'string') { // Check type specifically
      return { success: false, error: "New Member ID must be provided." };
  }
  // Prevent setting an empty Member ID - use Delete action instead
  if (newMemberId === '') {
      return { success: false, error: "Member ID cannot be empty. To remove it, use the Delete action." };
  }
  // --- End Validation ---

  try {
    // Check uniqueness before attempting update
    const { count, error: checkError } = await serviceRoleSupabase
      .from('member_ids')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', orgId)
      .eq('member_id', newMemberId)
      .not('group_user_id', 'eq', groupUserId); // Exclude the current user

    if (checkError) {
      console.error("Error checking member ID uniqueness for update:", checkError);
      return { success: false, error: "Database error checking ID uniqueness." };
    }
    if (count && count > 0) {
      return { success: false, error: `Member ID '${newMemberId}' is already taken by another user.` };
    }

    // First try to update an existing record
    const { data: updateData, error: updateError } = await serviceRoleSupabase
      .from('member_ids')
      .update({ member_id: newMemberId }) // Update the member_id field
      .eq('group_user_id', groupUserId) // Target the row by group_user_id
      .eq('group_id', orgId) // Also ensure it's within the correct group
      .select('id'); // Select something to see if a row was updated

    if (updateError) {
      console.error('Error updating member_id:', updateError);
      // Check for unique constraint violation on (group_id, member_id) which might still happen
      // if the pre-check had a race condition (unlikely but possible)
      if (updateError.message.includes("member_ids_unique_per_group")) {
         return { success: false, error: `Member ID '${newMemberId}' is already taken.` };
      }
      // Handle NOT NULL constraint violation (should be caught by empty check earlier)
      if (updateError.message.includes('violates not-null constraint')) {
         return { success: false, error: "Member ID cannot be empty. Use Delete to remove." };
      }
      return { success: false, error: "Failed to update Member ID due to database error." };
    }
    
    // If no record was updated, insert a new one instead
    if (!updateData || updateData.length === 0) {
        console.log(`No existing member_id record found for groupUserId ${groupUserId} in org ${orgId}. Creating new record.`);
        
        const { data: insertData, error: insertError } = await serviceRoleSupabase
          .from('member_ids')
          .insert({
            group_user_id: groupUserId,
            group_id: orgId,
            member_id: newMemberId
          })
          .select('id');
          
        if (insertError) {
          console.error('Error inserting new member_id record:', insertError);
          
          // Check for unique constraint violation (could happen in race condition)
          if (insertError.message.includes("member_ids_unique_per_group")) {
            return { success: false, error: `Member ID '${newMemberId}' is already taken.` };
          }
          
          return { success: false, error: "Failed to create Member ID record." };
        }
        
        if (!insertData || insertData.length === 0) {
          return { success: false, error: "Failed to create Member ID record (no data returned)." };
        }
        
        console.log(`Successfully created new member_id record: ${insertData[0].id}`);
    } else {
        console.log(`Successfully updated existing member_id record: ${updateData[0].id}`);
    }

    // --- Revalidation ---
    // Fetch org slug for revalidation (can't rely on it being in formData)
    const { data: groupData, error: groupError } = await serviceRoleSupabase
       .from('group')
       .select('slug')
       .eq('id', orgId)
       .single();

    if (!groupError && groupData?.slug) {
        revalidatePath(`/@${groupData.slug}/members`);
        // Consider revalidating specific member details page if applicable
        // revalidatePath(`/@${groupData.slug}/members/${groupUserId}`); // Or similar
    } else {
        console.warn(`Could not fetch org slug for orgId ${orgId} during member ID update revalidation.`);
        // Fallback revalidation if needed
        revalidatePath('/','layout'); 
    }
    // --- End Revalidation ---

    return { success: true, data: { updatedId: newMemberId } };

  } catch (err: any) {
    console.error("Unexpected error updating member ID:", err);
    return { success: false, error: "An unexpected server error occurred." };
  }
}

/**
 * Deletes the member_id record for a specific group_user.
 * Accepts FormData compatible with useFormState.
 */
export async function deleteGroupUserMemberId(
  currentState: any, // Previous form state
  formData: FormData
): Promise<ActionResult<{}>> {
    const groupUserId = formData.get('groupUserId') as string;
    const orgId = formData.get('orgId') as string;
    const memberId = formData.get('memberId') as string | null;
    const recordId = formData.get('recordId') as string | null;

    console.log('Delete Member ID action called with params:', { 
      groupUserId, orgId, memberId, recordId 
    });

    const supabase = await createServerClient(); // Use server client for auth context
    const serviceRoleSupabase = await createServiceRoleClient(); // For operations

    // --- Permission Check ---
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return { success: false, error: "Authentication failed or user not found." };
    }
    const hasPermission = await checkUserAccess({
        userId: user.id,
        groupId: orgId,
        // Use edit permission for delete as well, or define a specific delete permission
        requiredPermissions: [permissions.memberships.edit],
    });
    if (!hasPermission) {
        return { success: false, error: "You don't have permission to delete member IDs." };
    }
    // --- End Permission Check ---

    // --- Validation ---
    if (!groupUserId) {
        return { success: false, error: "Group User ID is missing from form data." };
    }
    if (!orgId) {
        return { success: false, error: "Organization ID is missing from form data." };
    }
    // --- End Validation ---

    try {
        // If we have a direct record ID, attempt to delete by that first
        if (recordId) {
            console.log(`Attempting to delete member_ids record directly by ID: ${recordId}`);
            const { error: directDeleteError } = await serviceRoleSupabase
                .from('member_ids')
                .delete()
                .eq('id', recordId);
            
            if (!directDeleteError) {
                console.log(`Successfully deleted member_ids record by ID: ${recordId}`);
                await revalidateAfterDelete(serviceRoleSupabase, orgId);
                return { success: true };
            } else {
                console.error(`Failed to delete by record ID: ${recordId}`, directDeleteError);
                // Fall through to other deletion methods
            }
        }

        // If we have the member ID, try looking up and deleting by that
        if (memberId) {
            console.log(`Attempting to delete using member_id: ${memberId}`);
            const { data: foundRecord, error: lookupError } = await serviceRoleSupabase
                .from('member_ids')
                .select('id')
                .eq('group_id', orgId)
                .eq('group_user_id', groupUserId)
                .eq('member_id', memberId)
                .maybeSingle();
            
            if (foundRecord && !lookupError) {
                console.log(`Found record by member_id: ${foundRecord.id}`);
                const { error: memberIdDeleteError } = await serviceRoleSupabase
                    .from('member_ids')
                    .delete()
                    .eq('id', foundRecord.id);
                
                if (!memberIdDeleteError) {
                    console.log(`Successfully deleted member_ids record by member_id lookup`);
                    await revalidateAfterDelete(serviceRoleSupabase, orgId);
                    return { success: true };
                } else {
                    console.error('Error deleting by member ID lookup:', memberIdDeleteError);
                    // Fall through to standard deletion
                }
            } else if (lookupError) {
                console.error('Error looking up by member ID:', lookupError);
                // Fall through to standard deletion
            } else {
                console.log(`No record found by member_id: ${memberId}`);
                // Fall through to standard deletion
            }
        }

        // Standard method - try to find by group_user_id and group_id
        const { data: existing, error: checkErr } = await serviceRoleSupabase
          .from('member_ids')
          .select('id')
          .eq('group_user_id', groupUserId)
          .eq('group_id', orgId)
          .maybeSingle();

        if (checkErr) {
            console.error("Error checking member ID before delete:", checkErr);
            // Don't necessarily fail, proceed with delete attempt
        }

        if (!existing && !checkErr) {
            // No record found, maybe already deleted. Return success.
            console.log(`Member ID for groupUserId ${groupUserId} in org ${orgId} not found for deletion (already deleted?).`);
            // Revalidate just in case state was stale
            await revalidateAfterDelete(serviceRoleSupabase, orgId);
            return { success: true };
        }

        // Proceed with deletion using the standard method
        console.log(`Attempting standard deletion by group_user_id and group_id`);
        const { error: deleteError } = await serviceRoleSupabase
            .from('member_ids')
            .delete()
            .eq('group_user_id', groupUserId)
            .eq('group_id', orgId);

        if (deleteError) {
            console.error("Error deleting member ID:", deleteError);
            return { success: false, error: "Failed to delete Member ID due to database error." };
        }

        // Revalidate paths after successful deletion
        await revalidateAfterDelete(serviceRoleSupabase, orgId);
        return { success: true };

    } catch (err: any) {
        console.error("Unexpected error deleting member ID:", err);
        return { success: false, error: "An unexpected server error occurred." };
    }
}

// Helper function to revalidate paths after delete
async function revalidateAfterDelete(supabase: any, orgId: string) {
    const { data: groupData, error: groupError } = await supabase
        .from('group')
        .select('slug')
        .eq('id', orgId)
        .single();

    if (!groupError && groupData?.slug) {
        revalidatePath(`/@${groupData.slug}/members`);
    } else {
        console.warn(`Could not fetch org slug for orgId ${orgId} during member ID delete revalidation.`);
        revalidatePath('/','layout');
    }
} 