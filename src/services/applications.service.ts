import { createClient } from "@/lib/utils/supabase/server";
import { Database } from "@/lib/types/database.types";
import { OrderService } from "./order.service";
import { ProductService } from "./product.service";

export type Application = {
  id: string;
  user_id: string;
  product_id: string;
  group_id: string;
  is_active: boolean;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  status: 'pending' | 'pending_payment' | 'approved' | 'rejected';
  order_id: string | null;
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    full_name: string;
  };
  product: {
    id: string;
    name: string;
    price: number;
    currency: string;
    membership_tier: {
      activation_type: string;
      duration_months: number;
    };
  };
  group: {
    id: string;
    name: string;
    slug: string;
  };
  order?: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    completed_at: string | null;
  };
};

type ApplicationView = {
  id: string;
  user_id: string;
  product_id: string;
  group_id: string;
  status: 'pending' | 'pending_payment' | 'approved' | 'rejected';
  submitted_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  user_data: {
    id: string;
    email: string;
    full_name: string;
  };
  product_name: string;
  product_price: number;
  product_currency: string;
  duration_months: number;
  activation_type: string;
  group_name: string;
  group_slug: string;
  order_id: string | null;
  order_status: string;
  amount: number;
  currency: string;
  payment_completed_at: string | null;
};

export async function getPendingApplications(groupId: string): Promise<Application[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('membership_applications_view')
    .select()
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as ApplicationView[]).map(mapViewToApplication);
}

export async function approveApplication(applicationId: string): Promise<Application> {
  const supabase = await createClient();

  // Get application details
  const { data: application, error: applicationError } = await supabase
    .from('membership_applications_view')
    .select()
    .eq('id', applicationId)
    .single();

  if (applicationError) throw applicationError;
  if (!application) throw new Error('Application not found');

  const now = new Date().toISOString();
  const shouldActivate = application.product_price === 0 || 
    (application.activation_type !== 'payment_required' && 
     application.activation_type !== 'review_then_payment');

  // Update application status
  const newStatus = application.activation_type === 'review_then_payment' 
    ? 'pending_payment' 
    : 'approved';

  // Start transaction
  const { error: updateError } = await supabase.rpc('approve_application', { 
    p_application_id: applicationId,
    p_new_status: newStatus,
    p_should_activate: shouldActivate,
    p_approved_at: now
  });

  if (updateError) throw updateError;

  // Fetch the updated record
  const { data: updatedApplication, error: fetchError } = await supabase
    .from('membership_applications_view')
    .select()
    .eq('id', applicationId)
    .single();

  if (fetchError) throw fetchError;
  return mapViewToApplication(updatedApplication as ApplicationView);
}

export async function rejectApplication(applicationId: string): Promise<Application> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  // Start transaction
  const { error: updateError } = await supabase.rpc('reject_application', { 
    p_application_id: applicationId,
    p_rejected_at: now
  });

  if (updateError) throw updateError;

  // Fetch the updated record
  const { data: updatedApplication, error: fetchError } = await supabase
    .from('membership_applications_view')
    .select()
    .eq('id', applicationId)
    .single();

  if (fetchError) throw fetchError;
  return mapViewToApplication(updatedApplication as ApplicationView);
}

export async function getPendingPaymentApplications(groupId: string): Promise<Application[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('membership_applications_view')
    .select()
    .eq('group_id', groupId)
    .eq('status', 'pending_payment')
    .order('approved_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as ApplicationView[]).map(mapViewToApplication);
}

export async function getApprovedApplications(groupId: string): Promise<Application[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('membership_applications_view')
    .select()
    .eq('group_id', groupId)
    .eq('status', 'approved')
    .is('rejected_at', null)
    .order('approved_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as ApplicationView[]).map(mapViewToApplication);
}

export async function getRejectedApplications(groupId: string): Promise<Application[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('membership_applications_view')
    .select()
    .eq('group_id', groupId)
    .eq('status', 'rejected')
    .not('rejected_at', 'is', null)
    .order('rejected_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as ApplicationView[]).map(mapViewToApplication);
}

export async function createMembershipApplication(
  groupUserId: string,
  productId: string
): Promise<Application> {
  const supabase = await createClient();

  // Get product details to determine initial status
  const product = await ProductService.getMembershipTier(productId);
  if (!product) throw new Error('Product not found');

  // Get the user_id from group_users
  const { data: groupUser, error: groupUserError } = await supabase
    .from('group_users')
    .select('user_id, group_id')
    .eq('id', groupUserId)
    .single();

  if (groupUserError) throw groupUserError;
  if (!groupUser) throw new Error('Group user not found');

  let initialStatus: Application['status'];
  switch (product.membership_tier.activation_type) {
    case 'automatic':
      initialStatus = 'approved';
      break;
    case 'review_required':
      initialStatus = 'pending';
      break;
    case 'payment_required':
      initialStatus = 'pending_payment';
      break;
    case 'review_then_payment':
      initialStatus = 'pending';
      break;
    default:
      initialStatus = 'pending';
  }

  // Create the application
  const { data, error } = await supabase
    .from('applications')
    .insert({
      group_user_id: groupUserId,
      tier_id: productId,
      status: initialStatus
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create application');

  // Fetch the full application details
  const { data: fullApplication, error: fetchError } = await supabase
    .from('membership_applications_view')
    .select()
    .eq('id', data.id)
    .single();

  if (fetchError) throw fetchError;
  if (!fullApplication) throw new Error('Failed to fetch application details');

  return mapViewToApplication(fullApplication as ApplicationView);
}

export async function getUserMembershipApplications(userId: string, groupId: string): Promise<Application[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('membership_applications_view')
    .select()
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as ApplicationView[]).map(mapViewToApplication);
}

function mapViewToApplication(row: ApplicationView): Application {
  return {
    id: row.id,
    user_id: row.user_id,
    product_id: row.product_id,
    group_id: row.group_id,
    is_active: false,
    created_at: row.submitted_at,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    status: row.status,
    order_id: row.order_id ?? null,
    user: {
      id: row.user_data.id,
      email: row.user_data.email,
      first_name: row.user_data.full_name.split(' ')[0],
      last_name: row.user_data.full_name.split(' ').slice(1).join(' '),
      full_name: row.user_data.full_name
    },
    product: {
      id: row.product_id,
      name: row.product_name,
      price: row.product_price,
      currency: row.product_currency,
      membership_tier: {
        activation_type: row.activation_type,
        duration_months: row.duration_months
      }
    },
    group: {
      id: row.group_id,
      name: row.group_name,
      slug: row.group_slug
    },
    order: row.order_id ? {
      id: row.order_id,
      status: row.order_status,
      amount: row.amount,
      currency: row.currency,
      completed_at: row.payment_completed_at
    } : undefined
  };
} 