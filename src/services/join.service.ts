import { createClient } from "@/lib/utils/supabase/server";
import { ProductService } from "@/services/product.service";
import { createMembershipApplication } from "@/services/applications.service";
import { IMembershipTierProduct, MembershipTierRow } from "@/lib/types/product";
import { Currency, MembershipActivationType } from "@/lib/types/membership";
import { MembershipActivationService } from './membership-activation.service';

export async function getMembershipTierDetails(tierId: string): Promise<IMembershipTierProduct | null> {
  return await ProductService.getMembershipTier(tierId);
}

export function validateMembershipActivation(
  price: number,
  activationType: string
): string | null {
  // Free memberships can't require payment
  if (price === 0 && 
    (activationType === 'payment_required' || 
     activationType === 'review_then_payment')) {
    return 'Free memberships cannot require payment';
  }

  // Paid memberships must require payment or review
  if (price > 0 && activationType === 'automatic') {
    return 'Paid memberships must require payment, review, or both';
  }

  return null;
}

export async function createUserMembership(userId: string, tierId: string, groupId: string) {
  const supabase = await createClient();

  // Get the membership tier details
  const tier = await ProductService.getMembershipTier(tierId);
  if (!tier) throw new Error("Membership tier not found");

  // Use upsert to atomically get or create the group user
  const { data: groupUser, error: groupUserError } = await supabase
    .from('group_users')
    .upsert(
      {
        user_id: userId,
        group_id: groupId,
        is_active: tier.membership_tier.activation_type === 'automatic',
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'user_id,group_id',
        ignoreDuplicates: true // Changed to true to update existing records
      }
    )
    .select()
    .single();

  if (groupUserError) throw groupUserError;
  if (!groupUser) throw new Error("Failed to create or get group user");

  // Create the application
  const application = await createMembershipApplication(groupUser.id, tierId);
  
  // If activation type is automatic, process the application immediately
  if (tier.membership_tier.activation_type === 'automatic') {
    await MembershipActivationService.processApplication(application.id);
  }

  return groupUser.id;
}

export async function getMembershipDetails(tierId: string): Promise<IMembershipTierProduct | null> {
  return await ProductService.getMembershipTier(tierId);
}

export async function createApplication(
  groupUserId: string,
  tierId: string
): Promise<void> {
  const supabase = await createClient();

  // Get the membership tier details first
  const { data: tier, error: tierError } = await supabase
    .from('products')
    .select(`
      price,
      membership_tiers!inner (
        activation_type
      )
    `)
    .eq('id', tierId)
    .single();

  if (tierError || !tier) {
    throw new Error('Membership tier not found');
  }

  const membershipTier = Array.isArray(tier.membership_tiers) 
    ? tier.membership_tiers[0] 
    : tier.membership_tiers;

  // Determine initial status based on activation type
  let status: 'pending' | 'pending_payment';
  if (tier.price === 0) {
    status = 'pending';
  } else if (membershipTier.activation_type === 'payment_required') {
    status = 'pending_payment';
  } else if (membershipTier.activation_type === 'review_then_payment') {
    status = 'pending';
  } else {
    status = 'pending';
  }

  const { error } = await supabase
    .from('applications')
    .insert({
      group_user_id: groupUserId,
      tier_id: tierId,
      status
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
    activation_type: string;
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

export async function getUserMembership(userIdOrParams: string | { userId: string; groupId: string }, groupIdParam?: string) {
  const supabase = await createClient();
  
  // Handle both parameter styles for backward compatibility
  let userId: string;
  let groupId: string;
  
  if (typeof userIdOrParams === 'string' && groupIdParam) {
    // Old style with positional parameters
    userId = userIdOrParams;
    groupId = groupIdParam;
  } else if (typeof userIdOrParams === 'object') {
    // New style with object parameter
    userId = userIdOrParams.userId;
    groupId = userIdOrParams.groupId;
  } else {
    throw new Error('Invalid parameters for getUserMembership');
  }
  
  console.log('Getting user membership:', { userId, groupId });

  // Get the group user ID first
  const { data: groupUser, error: groupUserError } = await supabase
    .from('group_users')
    .select('id')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .single();

  if (groupUserError) {
    console.log('Error getting group user:', groupUserError);
    return null;
  }

  if (!groupUser) {
    // console.log('No group user found');
    return null;
  }

  // Define types for the membership data structure
  type MembershipTierSettings = {
    member_id_format: string;
  };

  type MembershipTierData = {
    activation_type: string;
    duration_months: number;
    membership_tier_settings: MembershipTierSettings[];
  };

  type TierData = {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    membership_tiers: MembershipTierData;
  };

  type PaymentData = {
    id: string;
    status: string;
  };

  type OrderData = {
    id: string;
    status: string;
    payments: PaymentData[];
  };

  type MembershipData = {
    id: string;
    status: string;
    start_date: string;
    end_date: string | null;
    created_at: string;
    tier: TierData;
    orders: OrderData;
  };

  // Get the membership
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select(`
      id, 
      status, 
      start_date, 
      end_date,
      created_at,
      tier:tier_id (
        
          activation_type,
          duration_months,
          membership_tier_settings (
            member_id_format
          )
      ),
      orders:order_id (
        id,
        status,
        payments (
          id,
          status
        )
      )
    `)
    .eq('group_user_id', groupUser.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('Membership result:', groupUser.id, { membership, error: membershipError });

  if (membershipError) {
    throw membershipError;
  }

  if (membership) {
    const typedMembership = membership as unknown as MembershipData;
    
    // Check if there are any pending payments
    const hasPendingPayments = typedMembership.orders?.status === 'pending';
    const status = hasPendingPayments ? 'pending_payment' : typedMembership.status;

    // A membership is active if:
    // 1. It has status 'active'
    // 2. It's within its date range
    // 3. Has no pending payments
    const isActive = typedMembership.status === 'active' && 
                    new Date(typedMembership.start_date) <= new Date() &&
                    (!typedMembership.end_date || new Date(typedMembership.end_date) > new Date()) &&
                    !hasPendingPayments;

    return {
      id: typedMembership.id,
      status,
      created_at: typedMembership.created_at,
      product: {
        id: typedMembership.tier.id,
        name: typedMembership.tier.name,
        description: typedMembership.tier.description,
        price: typedMembership.tier.price,
        currency: typedMembership.tier.currency,
        membership_tiers: {
          activation_type: typedMembership.tier.activation_type,
          duration_months: typedMembership.tier.duration_months,
          member_id_format: typedMembership.tier.membership_tier_settings?.[0]?.member_id_format
        }
      },
      is_active: isActive,
      start_date: typedMembership.start_date,
      end_date: typedMembership.end_date
    };
  }

  return null;
}

export const statusMessages = {
  'automatic': 'You have been automatically approved. Welcome!',
  'review_required': 'Your application is pending review.',
  'payment_required': 'Please complete payment to join.',
  'review_then_payment': 'Your application is pending review. Once approved, you will be asked to complete payment.',
} as const;

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
      is_active: isActive // Default to false unless explicitly set to true (e.g., for org creators)
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

interface ApplicationWithTier {
  id: string;
  group_user_id: string;
  tier_id: string;
  tier: {
    id: string;
    type: 'membership_tier';
    name: string;
    description: string | null;
    price: number;
    currency: Currency;
    group_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    form_template_id: string;
    membership_tier: MembershipTierRow;
  };
}

interface ApplicationResponse {
  id: string;
  group_user_id: string;
  tier_id: string;
  tier: {
    id: string;
    type: 'membership_tier';
    name: string;
    description: string | null;
    price: number;
    currency: Currency;
    group_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    form_template_id: string;
    membership_tiers: Array<{
      product_id: string;
      duration_months: number;
      activation_type: MembershipActivationType;
      member_id_format?: string;
      form_template_id?: string;
    }>;
  };
}

export async function approveApplication(applicationId: string) {
  const supabase = await createClient();

  console.log('Approving application:', applicationId);

  // Get application with tier details
  const { data, error: appError } = await supabase
    .from('applications')
    .select(`
      id,
      group_user_id,
      tier_id,
      tier:products!inner (
        id,
        type,
        name,
        description,
        price,
        currency,
        group_id,
        is_active,
        created_at,
        updated_at,
        form_template_id,
        membership_tiers!inner (
          product_id,
          duration_months,
          activation_type,
          member_id_format,
          form_template_id
        )
      )
    `)
    .eq('id', applicationId)
    .single();

  if (appError) {
    console.error('Error fetching application:', appError);
    throw appError;
  }

  if (!data) {
    console.error('Application not found:', applicationId);
    throw new Error('Application not found');
  }

  console.log('Found application:', data);

  // Update application status first
  console.log('Updating application status to approved:', applicationId);
  const { error: updateError } = await supabase
    .from('applications')
    .update({ 
      status: 'approved',
      approved_at: new Date().toISOString()
    })
    .eq('id', applicationId);

  if (updateError) {
    console.error('Error updating application status:', updateError);
    throw updateError;
  }

  // Use MembershipActivationService to process the application
  try {
    console.log('Processing application with MembershipActivationService:', applicationId);
    const result = await MembershipActivationService.processApplication(applicationId);
    console.log('Application processed successfully:', result);
    return result;
  } catch (error) {
    console.error('Error processing application:', error);
    throw error;
  }
}

interface ApplicationWithTierDetails {
  id: string;
  group_user_id: string;
  tier_id: string;
  tier: {
    id: string;
    membership_tiers: MembershipTierRow[];
  };
}

export async function completePayment(applicationId: string) {
  const supabase = await createClient();
  console.log('Starting payment completion process for:', applicationId);

  // Get application details
  const { data: application, error: applicationError } = await supabase
    .from('applications')
    .select('id, status')
    .eq('id', applicationId)
    .single();

  console.log('Application query result:', { application, error: applicationError });

  if (applicationError || !application) throw applicationError || new Error('Application not found');

  // Start transaction for payment completion
  const { error: updateError } = await supabase.rpc('complete_payment', { 
    p_application_id: applicationId
  });

  console.log('Payment completion RPC result:', { error: updateError });

  if (updateError) throw updateError;

  // After payment is completed and application is approved, create membership
  const { data: updatedApplication, error: checkError } = await supabase
    .from('applications')
    .select('status')
    .eq('id', applicationId)
    .single();

  console.log('Updated application status:', { updatedApplication, error: checkError });

  if (updatedApplication?.status === 'approved') {
    console.log('Application is approved, creating membership');
    
    try {
      // Use the MembershipActivationService to process the application
      await MembershipActivationService.processApplication(applicationId);
      console.log('Membership created and group user activated successfully');
    } catch (error) {
      console.error('Error processing application after payment:', error);
      throw error;
    }
  } else {
    console.log('Application not approved after payment completion, status:', updatedApplication?.status);
  }

  console.log('Payment completion process finished');
}

export async function rejectApplication(applicationId: string) {
  const supabase = await createClient();

  // Start transaction
  const { error: updateError } = await supabase.rpc('reject_application', { 
    p_application_id: applicationId
  });

  if (updateError) throw updateError;
} 