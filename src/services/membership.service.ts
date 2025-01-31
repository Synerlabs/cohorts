import { createClient } from "@/lib/utils/supabase/server";
import { Membership, MembershipStatus, MembershipTier } from "@/lib/types/membership";
import { MemberIdService } from "@/services/member-id.service";

export class MembershipService {
  static async getMembership(id: string): Promise<Membership | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getMembershipByOrderId(orderId: string): Promise<Membership | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("order_id", orderId)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async createMembership(data: {
    order_id: string;
    group_user_id: string;
    tier_id: string;
    start_date?: string;
    end_date?: string;
    metadata?: Record<string, any>;
  }): Promise<Membership> {
    const supabase = await createClient();

    // Start a transaction
    await supabase.rpc('begin_transaction');
    
    try {
      // Get group ID from group_user
      const { data: groupUser, error: groupUserError } = await supabase
        .from("group_users")
        .select("group_id")
        .eq("id", data.group_user_id)
        .single();

      if (groupUserError) throw groupUserError;

      // Get member ID format from membership tier settings
      const { data: tierSettings, error: tierError } = await supabase
        .from("membership_tier_settings")
        .select("member_id_format")
        .eq("tier_id", data.tier_id)
        .single();

      if (tierError) throw tierError;

      // Create membership record
      const { data: membership, error: membershipError } = await supabase
        .from("memberships")
        .insert({
          ...data,
          status: MembershipStatus.ACTIVE
        })
        .select()
        .single();
    
      if (membershipError) throw membershipError;

      // Generate member ID
      const memberId = await MemberIdService.generateMemberId(
        groupUser.group_id,
        tierSettings.member_id_format
      );

      // Assign member ID to membership
      await MemberIdService.assignMemberIdToMembership(
        membership.id,
        memberId
      );

      // Commit transaction
      await supabase.rpc('commit_transaction');

      return membership;
    } catch (error) {
      // Rollback on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  static async updateMembershipStatus(id: string, status: MembershipStatus): Promise<Membership> {
    const supabase = await createClient();
    
    const { data: membership, error } = await supabase
      .from("memberships")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return membership;
  }

  static async updateMembershipDates(id: string, data: {
    start_date?: string;
    end_date?: string;
  }): Promise<Membership> {
    const supabase = await createClient();
    
    const { data: membership, error } = await supabase
      .from("memberships")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return membership;
  }

  static async getMembershipsByGroupUser(groupUserId: string): Promise<Membership[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("group_user_id", groupUserId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getActiveMembershipCount(groupId: string): Promise<number> {
    const supabase = await createClient();
    
    const { count, error } = await supabase
      .from("memberships")
      .select("*", { count: 'exact', head: true })
      .eq("status", MembershipStatus.ACTIVE)
      .eq("group_id", groupId);
    
    if (error) throw error;
    return count || 0;
  }
}

export async function getMembershipTiers({ orgId }: { orgId: string }): Promise<MembershipTier[]> {
  const supabase = await createClient();

  const { data: tiers, error } = await supabase
    .from("membership_tier")
    .select(`
      *,
      memberships (
        id
      )
    `)
    .eq("group_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Add member count to each tier
  return tiers.map(tier => ({
    ...tier,
    member_count: tier.memberships?.length || 0
  }));
}

export async function createMembershipTier(data: {
  name: string;
  description?: string;
  price: number;
  duration_months: number;
  group_id: string;
  activation_type: 'immediate' | 'manual';
}) {
  const supabase = await createClient();

  const { data: tier, error } = await supabase
    .from("membership_tier")
    .insert({
      name: data.name,
      description: data.description,
      price: data.price,
      duration_months: data.duration_months,
      group_id: data.group_id,
      activation_type: data.activation_type
    })
    .select()
    .single();

  if (error) throw error;
  return tier;
}

export async function updateMembershipTier(id: string, data: {
  name?: string;
  description?: string;
  price?: number;
  duration_months?: number;
  activation_type?: 'immediate' | 'manual';
}) {
  const supabase = await createClient();

  const { data: tier, error } = await supabase
    .from("membership_tier")
    .update({
      name: data.name,
      description: data.description,
      price: data.price,
      duration_months: data.duration_months,
      activation_type: data.activation_type
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return tier;
}

export async function deleteMembershipTier(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("membership_tier")
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getMemberships({ orgId }: { orgId: string }): Promise<MembershipTier[]> {
  const supabase = await createClient();

  const { data: tiers, error } = await supabase
    .from("membership_tier")
    .select(`
      *,
      memberships (
        id
      )
    `)
    .eq("group_id", orgId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Add member count to each tier
  return tiers.map(tier => ({
    ...tier,
    member_count: tier.memberships?.length || 0
  }));
}
