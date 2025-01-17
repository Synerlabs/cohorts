import { createClient } from "@/lib/utils/supabase/server";
import { MembershipActivationType } from "@/lib/types/membership";

interface MembershipDetails {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  activation_type: MembershipActivationType;
  group_id: string;
}

export async function getMembershipDetails(membershipId: string): Promise<MembershipDetails | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('membership')
    .select()
    .eq('id', membershipId)
    .single();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    price: data.price,
    duration_months: data.duration_months,
    activation_type: data.activation_type || MembershipActivationType.AUTOMATIC,
    group_id: data.group_id
  };
}

export function validateMembershipActivation(
  price: number,
  activationType: MembershipActivationType
): string | null {
  // Free memberships cannot require payment
  if (price === 0 && (
    activationType === MembershipActivationType.PAYMENT_REQUIRED ||
    activationType === MembershipActivationType.REVIEW_THEN_PAYMENT
  )) {
    return 'Free memberships cannot require payment';
  }

  // Paid memberships cannot be automatic
  if (price > 0 && activationType === MembershipActivationType.AUTOMATIC) {
    return 'Paid memberships cannot be automatic';
  }

  return null;
}

export async function getOrgSlug(groupId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('group')
    .select('slug')
    .eq('id', groupId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Organization not found');
  
  return { slug: data.slug };
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
  isActive: boolean,
  groupId: string
) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('user_membership')
    .insert([{
      user_id: userId,
      membership_id: membershipId,
      group_id: groupId,
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

export interface UserMembership {
  id: string;
  user_id: string;
  membership_id: string;
  group_id: string;
  is_active: boolean;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  membership: {
    name: string;
    price: number;
    duration_months: number;
    activation_type: MembershipActivationType;
  };
}

export async function getUserMembership(userId: string, groupId: string): Promise<UserMembership | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_membership')
    .select(`
      *,
      membership (
        name,
        price,
        duration_months,
        activation_type
      )
    `)
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No membership found
    throw error;
  }
  
  return data;
} 