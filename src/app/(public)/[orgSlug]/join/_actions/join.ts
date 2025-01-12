'use server';

import { createClient } from "@/lib/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface JoinWithMembershipParams {
  groupId: string;
  userId: string;
  membershipId: string;
}

export async function joinOrgWithMembership({
  groupId,
  userId,
  membershipId
}: JoinWithMembershipParams) {
  const supabase = await createClient();

  // First get the org slug for revalidation
  const { data: org, error: orgError } = await supabase
    .from('groups')
    .select('slug')
    .eq('id', groupId)
    .single();

  if (orgError) {
    return {
      success: false,
      message: 'Failed to find organization'
    };
  }

  // Create the group user first
  const { error: groupUserError } = await supabase
    .from('group_users')
    .insert({
      group_id: groupId,
      user_id: userId,
      is_active: false // Pending approval
    });

  if (groupUserError && groupUserError.code !== '23505') { // Ignore unique violation
    return {
      success: false,
      message: groupUserError.message
    };
  }

  // Create the membership request
  const { error: membershipError } = await supabase
    .from('group_user_memberships')
    .insert({
      group_id: groupId,
      user_id: userId,
      membership_id: membershipId,
      is_active: false // Pending approval
    });

  if (membershipError) {
    return {
      success: false,
      message: membershipError.message
    };
  }

  revalidatePath(`/${org.slug}/join`);
  
  // Redirect to pending page or dashboard
  redirect(`/${org.slug}/join/pending`);
} 