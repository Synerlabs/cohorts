'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createServerClient, createServiceRoleClient } from '@/lib/utils/supabase/server';
import { permissions } from '@/lib/types/permissions';
import { withPermissions } from '@/lib/utils/action-permissions';
import { Tables } from '@/lib/types/database.types';

interface ActionResult {
  success?: boolean;
  error?: string;
}

// Assuming createServerClient() can create admin client based on env vars
// If not, we might need a dedicated admin client creator function

export async function addOrInviteMember(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {

  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }, params: { formData: FormData }) => {
      const email = params.formData.get('email') as string;
      const orgSlug = params.formData.get('orgSlug') as string;
      const firstName = params.formData.get('firstName') as string || undefined;
      const lastName = params.formData.get('lastName') as string || undefined;
      const orgId = context.groupId;
      
      const supabaseService = await createServiceRoleClient();

      if (!email || !orgId) {
        return { error: 'Internal error: Missing email or organization ID.' };
      }

      // Prepare optional metadata for invite
      const inviteMetadata = {
        first_name: firstName,
        last_name: lastName
      };

      try {
        type InviteResponse = { user: { id: string; [key: string]: any; } | null; [key: string]: any; };

        // Use Service Role Client for invite, pass names in data option
        const { data, error: inviteError } = await supabaseService.auth.admin.inviteUserByEmail(
          email,
          { data: inviteMetadata }
        );
        const inviteData = data as InviteResponse | null;

        let userIdToAdd: string | null = null;
        let isNewInvite = false;

        if (inviteError) {
            if (inviteError.message.includes('already registered')) {
                const maybeUserId = inviteData?.user?.id;
                if (!maybeUserId) return { error: 'Failed to retrieve existing user ID after invite attempt.' };
                userIdToAdd = maybeUserId;
                isNewInvite = false;
            } else {
                return { error: inviteError.message || 'Failed to invite user.' }; 
            }
        } else {
             const maybeUserId = inviteData?.user?.id;
             if (!maybeUserId) return { error: 'Invited user data not returned from Supabase.' };
             userIdToAdd = maybeUserId;
             isNewInvite = true;
        }

        if (!userIdToAdd) return { error: 'Internal error: Could not determine user ID.' };
        
        const { data: existingMembership, error: checkError } = await supabaseService
            .from('group_users')
            .select('id')
            .eq('user_id', userIdToAdd)
            .eq('group_id', orgId)
            .limit(1);

        if (checkError) return { error: checkError.message || 'Error checking membership.' }; 
        if (existingMembership && existingMembership.length > 0) return { error: 'User already exists and is a member of this organization.' }; 

        console.log(`Adding user ${userIdToAdd} to group ${orgId} as inactive`);
        const { error: insertError } = await supabaseService
            .from('group_users')
            .insert({ user_id: userIdToAdd, group_id: orgId, is_active: false });

        if (insertError) return { error: insertError.message || 'Failed to add user to organization group.' }; 
        
        revalidatePath(`/@${orgSlug}/members`);
        return { success: true };

      } catch (error: any) {
        console.error('Add/Invite Member Core Logic Error:', error);
        return { error: error.message || 'An unexpected error occurred during processing.' };
      }
    },
    // Permission context provider
    (params: { formData: FormData }) => {
      // Need groupId for permission check context
      const orgId = params.formData.get('orgId') as string;
      if (!orgId) throw new Error("Organization ID required for permission check");
      return {
        groupId: orgId, // Provide groupId for the permission check
        moduleType: 'group', // Using 'group' as moduleType, adjust if a 'members' type exists
        requiredPermissions: [
          permissions.members.invite
        ]
      };
    }
  );

  return handler(prevState, { formData });
} 