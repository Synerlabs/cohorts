import { createClient } from "@/lib/utils/supabase/server";
import { MembershipActivationType } from "@/lib/types/membership";

export function validateMembershipActivation(price: number, activationType: MembershipActivationType): string | null {
  if (price === 0) {
    if (activationType === MembershipActivationType.PAYMENT_REQUIRED || 
        activationType === MembershipActivationType.REVIEW_THEN_PAYMENT) {
      return "Free memberships cannot require payment";
    }
  } else {
    if (activationType === MembershipActivationType.AUTOMATIC) {
      return "Paid memberships must require payment, review, or both";
    }
  }
  return null;
}

export async function getMembershipDetails(membershipId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('membership')
    .select('activation_type, price')
    .eq('id', membershipId)
    .single();

  if (error) throw error;
  return data;
}

export async function getOrgSlug(groupId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('group')
    .select('slug')
    .eq('id', groupId)
    .single();

  if (error) throw error;
  return data;
}

export async function createGroupUser(groupId: string, userId: string, isActive: boolean) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('group_users')
    .insert([{
      group_id: groupId,
      user_id: userId,
      is_active: isActive
    }]);

  if (error && error.code !== '23505') throw error; // Ignore unique violation
}

export async function createUserMembership(
  userId: string, 
  membershipId: string, 
  isActive: boolean
) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('user_membership')
    .insert([{
      user_id: userId,
      membership_id: membershipId,
      is_active: isActive,
      starts_at: new Date().toISOString(),
      created_by: userId
    }]);

  if (error) throw error;
}

export const statusMessages = {
  [MembershipActivationType.AUTOMATIC]: 'Successfully joined the organization',
  [MembershipActivationType.REVIEW_REQUIRED]: 'Your membership request is pending review',
  [MembershipActivationType.PAYMENT_REQUIRED]: 'Please complete payment to activate your membership',
  [MembershipActivationType.REVIEW_THEN_PAYMENT]: 'Your membership request is pending review. Payment will be required after approval'
} as const; 