'use server';

import { createClient } from "@/lib/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type State = {
  message?: string;
  success?: boolean;
} | null;

export async function joinOrgWithMembership(
  prevState: State,
  formData: FormData
): Promise<State> {
  console.log('FormData received:', {
    groupId: formData.get('groupId'),
    userId: formData.get('userId'),
    membershipId: formData.get('membershipId')
  });

  const groupId = formData.get('groupId');
  const userId = formData.get('userId');
  const membershipId = formData.get('membershipId');

  if (!groupId || !userId || !membershipId) {
    return {
      success: false,
      message: 'Missing required fields'
    };
  }

  const supabase = await createClient();

  // First get the org slug for revalidation
  const { data: org, error: orgError } = await supabase
    .from('group')
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
    .from('user_membership')
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

  revalidatePath(`/@${org.slug}/join`);
  
  // Redirect to pending page or dashboard
//   redirect(`/${org.slug}/join/pending`);
} 