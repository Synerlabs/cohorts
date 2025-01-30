import { createClient } from "@/lib/utils/supabase/server";
import { ProductService } from "@/services/product.service";
import { createMembershipApplication } from "@/services/applications.service";
import { IMembershipTierProduct } from "@/lib/types/product";

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

  // Create or get the group user
  const { data: groupUser, error: groupUserError } = await supabase
    .from('group_users')
    .select()
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .single();

  if (groupUserError && groupUserError.code !== 'PGRST116') {
    throw groupUserError;
  }

  let groupUserId: string;

  if (!groupUser) {
    // Create new group user
    const { data: newGroupUser, error: newGroupUserError } = await supabase
      .from('group_users')
      .insert({
        user_id: userId,
        group_id: groupId,
        is_active: tier.membership_tier.activation_type === 'automatic'
      })
      .select()
      .single();

    if (newGroupUserError) throw newGroupUserError;
    groupUserId = newGroupUser.id;
  } else {
    groupUserId = groupUser.id;
  }

  // Create the application
  await createMembershipApplication(groupUserId, tierId);
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

export async function getUserMembership(userId: string, groupId: string) {
  const supabase = await createClient();
  
  console.log('Getting user membership:', { userId, groupId });
  
  // First get the group_user record
  const { data: groupUser, error: groupUserError } = await supabase
    .from('group_users')
    .select('id')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .single();

  console.log('Group user result:', { groupUser, error: groupUserError });

  if (groupUserError) {
    if (groupUserError.code === 'PGRST116') return null; // No group user found
    throw groupUserError;
  }

  // Then get the latest application for this user
  const { data: application, error: applicationError } = await supabase
    .from('applications')
    .select(`
      *,
      products:tier_id (
        id,
        name,
        price,
        membership_tiers!inner (
          activation_type,
          duration_months
        )
      ),
      orders!applications_order_id_fkey (
        id,
        status,
        payments (
          id,
          status
        )
      )
    `)
    .eq('group_user_id', groupUser.id)
    .eq('type', 'membership')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('Application result:', { application, error: applicationError });

  if (applicationError) {
    throw applicationError;
  }

  // Return the application with its membership tier info
  if (application) {
    console.log('Full application data:', JSON.stringify(application, null, 2));
    console.log('Membership tiers:', application.products.membership_tiers);

    // Check if there are any pending payments
    const hasPendingPayments = application.orders?.payments?.some((p: { status: string }) => p.status === 'pending');
    const status = hasPendingPayments ? 'pending_payment' : application.status;

    return {
      id: application.id,
      status,
      created_at: application.created_at,
      approved_at: application.approved_at,
      rejected_at: application.rejected_at,
      product: {
        id: application.products.id,
        name: application.products.name,
        price: application.products.price,
        membership_tiers: {
          activation_type: application.products.membership_tiers.activation_type,
          duration_months: application.products.membership_tiers.duration_months
        }
      },
      is_active: false
    };
  }

  // If no application found, check for active membership
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select(`
      *,
      orders!inner (
        id,
        status,
        created_at,
        suborders (
          id,
          products (
            id,
            name,
            price,
            membership_tiers!inner (
              activation_type,
              duration_months
            )
          )
        ),
        payments (
          id,
          status
        )
      )
    `)
    .eq('group_user_id', groupUser.id)
    .eq('status', 'active')
    .gte('start_date', new Date().toISOString())
    .or('end_date.is.null,end_date.gt.now()')
    .limit(1)
    .maybeSingle();

  console.log('Membership result:', { membership, error: membershipError });

  if (membershipError) {
    throw membershipError;
  }

  if (membership) {
    // Check if there are any pending payments
    const hasPendingPayments = membership.orders.payments?.some((p: { status: string }) => p.status === 'pending');
    const status = hasPendingPayments ? 'pending_payment' : membership.orders.status;

    // Get the product from the first suborder
    const product = membership.orders.suborders?.[0]?.products;

    // A membership is active if:
    // 1. It has status 'active'
    // 2. It's within its date range
    // 3. Has no pending payments
    const isActive = membership.status === 'active' && 
                    new Date(membership.start_date) <= new Date() &&
                    (!membership.end_date || new Date(membership.end_date) > new Date()) &&
                    !hasPendingPayments;

    return {
      id: membership.orders.id,
      status,
      created_at: membership.orders.created_at,
      product,
      is_active: isActive,
      start_date: membership.start_date,
      end_date: membership.end_date
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
    type: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    group_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    membership_tier: Array<{
      duration_months: number;
      activation_type: string;
    }>;
  };
}

export async function approveApplication(applicationId: string) {
  const supabase = await createClient();

  // Get the application details
  const { data, error: applicationError } = await supabase
    .from('applications')
    .select(`
      id,
      group_user_id,
      tier_id,
      tier:products!inner(
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
        membership_tier:membership_tiers(
          duration_months,
          activation_type
        )
      )
    `)
    .eq('id', applicationId)
    .single();

  if (applicationError) throw applicationError;
  if (!data) throw new Error("Application not found");

  const application = {
    id: data.id,
    group_user_id: data.group_user_id,
    tier_id: data.tier_id,
    tier: {
      id: data.tier[0].id,
      type: data.tier[0].type,
      name: data.tier[0].name,
      description: data.tier[0].description,
      price: data.tier[0].price,
      currency: data.tier[0].currency,
      group_id: data.tier[0].group_id,
      is_active: data.tier[0].is_active,
      created_at: data.tier[0].created_at,
      updated_at: data.tier[0].updated_at,
      membership_tier: data.tier[0].membership_tier
    }
  } as ApplicationWithTier;

  if (!application.tier) throw new Error("Membership tier not found");
  if (!application.tier.membership_tier?.[0]) throw new Error("Membership tier details not found");

  const tier: IMembershipTierProduct = {
    id: application.tier.id,
    type: 'membership_tier',
    name: application.tier.name,
    description: application.tier.description,
    price: application.tier.price,
    currency: application.tier.currency as IMembershipTierProduct['currency'],
    group_id: application.tier.group_id,
    is_active: application.tier.is_active,
    created_at: application.tier.created_at,
    updated_at: application.tier.updated_at,
    membership_tier: {
      duration_months: application.tier.membership_tier[0].duration_months,
      activation_type: application.tier.membership_tier[0].activation_type as IMembershipTierProduct['membership_tier']['activation_type'],
      product_id: application.tier.id
    }
  };

  // Update the application status
  const { error: updateError } = await supabase
    .from('applications')
    .update({
      status: tier.membership_tier.activation_type === 'payment_required' ? 'pending_payment' : 'approved',
      approved_at: new Date().toISOString()
    })
    .eq('id', applicationId);

  if (updateError) throw updateError;

  // If no payment is required, activate the group user
  if (tier.membership_tier.activation_type !== 'payment_required') {
    const { error: groupUserError } = await supabase
      .from('group_users')
      .update({ is_active: true })
      .eq('id', application.group_user_id);

    if (groupUserError) throw groupUserError;
  }
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