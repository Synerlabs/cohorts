'use server';

import { MembershipActivationType } from "@/lib/types/membership";
import { createClient } from "@/lib/utils/supabase/server";
import { getMembershipDetails, validateMembershipActivation, getOrgSlug, createGroupUser, createUserMembership, statusMessages } from "@/services/join.service";
import { revalidatePath } from "next/cache";

type State = {
  message?: string;
  error?: string;
  success: boolean;
};

export async function joinOrgWithMembership(
  prevState: State | null,
  formData: FormData
): Promise<State> {
  try {
    const groupId = formData.get('groupId') as string;
    const userId = formData.get('userId') as string;
    const membershipId = formData.get('membershipId') as string;

    if (!groupId || !userId || !membershipId) {
      return {
        success: false,
        error: 'Missing required fields'
      };
    }

    const supabase = await createClient();

    // First get the existing group_user record
    const { data: groupUser, error: groupUserError } = await supabase
      .from('group_users')
      .select('id')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .single();

    if (groupUserError && groupUserError.code !== 'PGRST116') {
      throw groupUserError;
    }

    // Get and validate membership
    const membership = await getMembershipDetails(membershipId);
    if (!membership) {
      return {
        success: false,
        error: 'Membership not found'
      };
    }

    const validationError = validateMembershipActivation(
      membership.price, 
      membership.activation_type
    );

    if (validationError) {
      return {
        success: false,
        error: validationError
      };
    }

    // Determine initial active state
    const isInitiallyActive = membership.price === 0 && 
      membership.activation_type === MembershipActivationType.AUTOMATIC;

    // Get org for revalidation
    const { slug } = await getOrgSlug(groupId);

    let groupUserId = groupUser?.id;

    // Only create group_user if it doesn't exist
    if (!groupUserId) {
      const { data: newGroupUser, error: createError } = await supabase
        .from('group_users')
        .insert({
          user_id: userId,
          group_id: groupId,
          is_active: isInitiallyActive
        })
        .select('id')
        .single();

      if (createError) throw createError;
      groupUserId = newGroupUser.id;
    }

    // Create membership using the existing or new group_user_id
    await createUserMembership(userId, membershipId, groupId);

    revalidatePath(`/@${slug}/join`);

    return {
      success: true,
      message: statusMessages[membership.activation_type]
    };

  } catch (error: any) {
    console.error('Join error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process join request'
    };
  }
} 