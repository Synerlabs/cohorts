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
  // Free memberships can't require payment
  if (price === 0 && 
    (activationType === MembershipActivationType.PAYMENT_REQUIRED || 
     activationType === MembershipActivationType.REVIEW_THEN_PAYMENT)) {
    return 'Free memberships cannot require payment';
  }

  // Paid memberships must require payment or review
  if (price > 0 && activationType === MembershipActivationType.AUTOMATIC) {
    return 'Paid memberships must require payment, review, or both';
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

export async function getUserMembership(userId: string, groupId: string) {
  const supabase = await createClient();
  
  // First get the group_user record
  const { data: groupUser, error: groupUserError } = await supabase
    .from('group_users')
    .select('id')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .single();

  if (groupUserError) {
    if (groupUserError.code === 'PGRST116') return null; // No group user found
    throw groupUserError;
  }

  // Then get the latest membership for this group user
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select(`
      *,
      membership:tier_id (
        name,
        price,
        activation_type
      )
    `)
    .eq('group_user_id', groupUser.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (membershipError) {
    if (membershipError.code === 'PGRST116') return null; // No membership found
    throw membershipError;
  }

  // If no active membership, check for applications
  if (!membership || !membership.is_active) {
    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .select(`
        *,
        membership:tier_id (
          name,
          price,
          activation_type
        )
      `)
      .eq('group_user_id', groupUser.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (applicationError && applicationError.code !== 'PGRST116') {
      throw applicationError;
    }

    if (application) {
      return {
        ...application,
        is_active: false
      };
    }
  }

  return membership;
}

export const statusMessages = {
  [MembershipActivationType.AUTOMATIC]: 'You have been automatically approved. Welcome!',
  [MembershipActivationType.REVIEW_REQUIRED]: 'Your application is pending review.',
  [MembershipActivationType.PAYMENT_REQUIRED]: 'Please complete payment to join.',
  [MembershipActivationType.REVIEW_THEN_PAYMENT]: 'Your application is pending review. Once approved, you will be asked to complete payment.',
};

export async function getOrgSlug(groupId: string): Promise<{ slug: string }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('group')
    .select('slug')
    .eq('id', groupId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Organization not found');

  return data;
}

export async function createGroupUser(groupId: string, userId: string, isActive: boolean = false) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('group_users')
    .insert({
      group_id: groupId,
      user_id: userId,
      is_active: isActive
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

export async function createUserMembership(userId: string, tierId: string, groupId: string) {
  const supabase = await createClient();

  // Get membership tier details
  const { data: tier, error: tierError } = await supabase
    .from('membership_tier')
    .select('*')
    .eq('id', tierId)
    .single();

  if (tierError) throw tierError;

  // First get or create the group_user record
  const { data: groupUser, error: groupUserError } = await supabase
    .from('group_users')
    .select('id')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .single();

  let groupUserId;
  if (groupUserError && groupUserError.code === 'PGRST116') {
    // Create new group_user
    const { data: newGroupUser, error: createError } = await supabase
      .from('group_users')
      .insert({
        user_id: userId,
        group_id: groupId,
        is_active: tier.activation_type === MembershipActivationType.AUTOMATIC
      })
      .select('id')
      .single();

    if (createError) throw createError;
    groupUserId = newGroupUser.id;
  } else if (groupUserError) {
    throw groupUserError;
  } else {
    groupUserId = groupUser.id;
    // Update existing group_user if activation is automatic
    if (tier.activation_type === MembershipActivationType.AUTOMATIC) {
      const { error: updateError } = await supabase
        .from('group_users')
        .update({ is_active: true })
        .eq('id', groupUserId);

      if (updateError) throw updateError;
    }
  }

  // Determine initial membership status based on activation type
  let membershipStatus;
  switch (tier.activation_type) {
    case MembershipActivationType.AUTOMATIC:
      membershipStatus = 'approved';
      break;
    case MembershipActivationType.REVIEW_REQUIRED:
      membershipStatus = 'pending';
      break;
    case MembershipActivationType.PAYMENT_REQUIRED:
      membershipStatus = 'pending_payment';
      break;
    case MembershipActivationType.REVIEW_THEN_PAYMENT:
      membershipStatus = 'pending';
      break;
    default:
      membershipStatus = 'pending';
  }

  // Create the membership
  const { error: membershipError } = await supabase
    .from('memberships')
    .insert({
      group_user_id: groupUserId,
      tier_id: tierId,
      is_active: tier.activation_type === MembershipActivationType.AUTOMATIC,
      status: membershipStatus,
      start_date: tier.activation_type === MembershipActivationType.AUTOMATIC ? new Date().toISOString() : null
    });

  if (membershipError) throw membershipError;

  // Create the application
  const { error: applicationError } = await supabase
    .from('applications')
    .insert({
      group_user_id: groupUserId,
      tier_id: tierId,
      status: membershipStatus,
      approved_at: tier.activation_type === MembershipActivationType.AUTOMATIC ? new Date().toISOString() : null
    });

  if (applicationError) throw applicationError;
}

export async function approveApplication(applicationId: string) {
  const supabase = await createClient();

  // Get application details
  const { data: application, error: appError } = await supabase
    .from('applications')
    .select(`
      *,
      membership_tier!inner (
        activation_type
      )
    `)
    .eq('id', applicationId)
    .single();

  if (appError) throw appError;

  // Update application status
  const newStatus = application.membership_tier.activation_type === 'review_then_payment' 
    ? 'pending_payment' 
    : 'approved';

  const shouldActivate = application.membership_tier.activation_type === 'review_required';

  // Start transaction
  const { error: updateError } = await supabase.rpc('approve_application', { 
    p_application_id: applicationId,
    p_new_status: newStatus,
    p_should_activate: shouldActivate
  });

  if (updateError) throw updateError;
}

export async function completePayment(applicationId: string) {
  const supabase = await createClient();

  // Start transaction
  const { error: updateError } = await supabase.rpc('complete_payment', { 
    p_application_id: applicationId
  });

  if (updateError) throw updateError;
}

export async function rejectApplication(applicationId: string) {
  const supabase = await createClient();

  // Start transaction
  const { error: updateError } = await supabase.rpc('reject_application', { 
    p_application_id: applicationId
  });

  if (updateError) throw updateError;
}

export async function getMembershipDetails(tierId: string): Promise<{
  id: string;
  name: string;
  price: number;
  activation_type: MembershipActivationType;
  group_id: string;
} | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('membership_tier')
    .select(`
      id,
      name,
      price,
      activation_type,
      group_id
    `)
    .eq('id', tierId)
    .single();

  if (error) throw error;
  if (!data) return null;

  return data;
} 