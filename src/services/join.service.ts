import { createClient } from "@/lib/utils/supabase/server";
import { MembershipActivationType } from "@/lib/types/membership";

interface MembershipTierDetails {
  id: string;
  name: string;
  price: number;
  activation_type: MembershipActivationType;
  group_id: string;
}

export async function getMembershipTierDetails(tierId: string): Promise<MembershipTierDetails | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('membership_tier')
    .select()
    .eq('id', tierId)
    .single();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    price: data.price,
    activation_type: data.activation_type,
    group_id: data.group_id
  };
}

export function validateMembershipActivation(
  price: number,
  activationType: MembershipActivationType
): string | null {
  // Free memberships must be immediate
  if (price === 0 && activationType === MembershipActivationType.MANUAL) {
    return 'Free memberships must be immediate';
  }

  // Paid memberships must be manual
  if (price > 0 && activationType === MembershipActivationType.IMMEDIATE) {
    return 'Paid memberships must be manual';
  }

  return null;
}

export async function createApplication(
  groupUserId: string,
  tierId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('applications')
    .insert({
      group_user_id: groupUserId,
      tier_id: tierId,
      status: 'pending'
    });

  if (error) throw error;
}

export async function getApplication(
  groupUserId: string,
  tierId: string
): Promise<{
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
} | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('applications')
    .select()
    .eq('group_user_id', groupUserId)
    .eq('tier_id', tierId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No application found
    throw error;
  }
  
  return data;
}

export async function getMembership(
  groupUserId: string,
  tierId: string
): Promise<{
  id: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  tier: {
    name: string;
    price: number;
    activation_type: MembershipActivationType;
  };
} | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('memberships')
    .select(`
      *,
      tier:membership_tier (
        name,
        price,
        activation_type
      )
    `)
    .eq('group_user_id', groupUserId)
    .eq('tier_id', tierId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No membership found
    throw error;
  }
  
  return data;
} 