import { createClient } from "@/lib/utils/supabase/server";
import { MembershipActivationType } from "@/lib/types/membership";
import { Database } from "@/types/database.types";

export type Application = {
  id: string;
  user_id: string;
  tier_id: string;
  group_id: string;
  is_active: boolean;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  status: 'pending' | 'pending_payment' | 'approved' | 'rejected';
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    full_name: string;
  };
  tier: {
    id: string;
    name: string;
    price: number;
    activation_type: MembershipActivationType;
  };
  group: {
    id: string;
    name: string;
    slug: string;
  };
};

type ApplicationView = {
  id: string;
  user_id: string;
  tier_id: string;
  group_id: string;
  is_active: boolean;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  status: 'pending' | 'pending_payment' | 'approved' | 'rejected';
  user_data: {
    id: string;
    email: string;
    full_name: string;
  };
  tier_data: {
    id: string;
    name: string;
    price: number;
    activation_type: string;
    duration_months: number;
  };
  group: {
    id: string;
    name: string;
    slug: string;
  };
};

export async function getPendingApplications(groupId: string): Promise<Application[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('applications_view')
    .select()
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as ApplicationView[]).map(row => ({
    id: row.id,
    user_id: row.user_id,
    tier_id: row.tier_id,
    group_id: row.group_id,
    is_active: row.is_active,
    created_at: row.created_at,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    status: row.status,
    user: {
      id: row.user_data.id,
      email: row.user_data.email,
      first_name: row.user_data.full_name.split(' ')[0],
      last_name: row.user_data.full_name.split(' ').slice(1).join(' '),
      full_name: row.user_data.full_name
    },
    tier: {
      id: row.tier_data.id,
      name: row.tier_data.name,
      price: row.tier_data.price,
      activation_type: (row.tier_data.activation_type as MembershipActivationType) || MembershipActivationType.AUTOMATIC
    },
    group: row.group
  }));
}

export async function approveApplication(applicationId: string) {
  const supabase = await createClient();

  // Get application details
  const { data: application, error: applicationError } = await supabase
    .from('applications')
    .select(`
      *,
      membership_tier!inner (
        activation_type,
        price
      )
    `)
    .eq('id', applicationId)
    .single();

  if (applicationError) throw applicationError;
  if (!application) throw new Error('Application not found');

  const activationType = application.membership_tier.activation_type as MembershipActivationType;
  const price = application.membership_tier.price;

  // Only activate if it's free or doesn't require payment
  const shouldActivate = price === 0 || 
    (activationType !== MembershipActivationType.PAYMENT_REQUIRED && 
     activationType !== MembershipActivationType.REVIEW_THEN_PAYMENT);

  // Update application status
  const newStatus = activationType === MembershipActivationType.REVIEW_THEN_PAYMENT 
    ? 'pending_payment' 
    : 'approved';

  // Start transaction
  const { error: updateError } = await supabase.rpc('approve_application', { 
    p_application_id: applicationId,
    p_new_status: newStatus,
    p_should_activate: shouldActivate
  });

  if (updateError) throw updateError;

  // Fetch the updated record
  const { data: updatedApplication, error: fetchError } = await supabase
    .from('applications_view')
    .select()
    .eq('id', applicationId)
    .single();

  if (fetchError) throw fetchError;
  return updatedApplication as ApplicationView;
}

export async function rejectApplication(applicationId: string) {
  const supabase = await createClient();

  // Start transaction
  const { error: updateError } = await supabase.rpc('reject_application', { 
    p_application_id: applicationId
  });

  if (updateError) throw updateError;

  // Fetch the updated record
  const { data: updatedApplication, error: fetchError } = await supabase
    .from('applications_view')
    .select()
    .eq('id', applicationId)
    .single();

  if (fetchError) throw fetchError;
  return updatedApplication as ApplicationView;
}

export async function getPendingPaymentApplications(groupId: string): Promise<Application[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('applications_view')
    .select()
    .eq('group_id', groupId)
    .eq('status', 'pending_payment')
    .order('approved_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as ApplicationView[]).map(row => ({
    id: row.id,
    user_id: row.user_id,
    tier_id: row.tier_id,
    group_id: row.group_id,
    is_active: row.is_active,
    created_at: row.created_at,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    status: row.status,
    user: {
      id: row.user_data.id,
      email: row.user_data.email,
      first_name: row.user_data.full_name.split(' ')[0],
      last_name: row.user_data.full_name.split(' ').slice(1).join(' '),
      full_name: row.user_data.full_name
    },
    tier: {
      id: row.tier_data.id,
      name: row.tier_data.name,
      price: row.tier_data.price,
      activation_type: (row.tier_data.activation_type as MembershipActivationType) || MembershipActivationType.AUTOMATIC
    },
    group: row.group
  }));
}

export async function getApprovedApplications(groupId: string): Promise<Application[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('applications_view')
    .select()
    .eq('group_id', groupId)
    .eq('status', 'approved')
    .is('rejected_at', null)
    .order('approved_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as ApplicationView[]).map(row => ({
    id: row.id,
    user_id: row.user_id,
    tier_id: row.tier_id,
    group_id: row.group_id,
    is_active: row.is_active,
    created_at: row.created_at,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    status: row.status,
    user: {
      id: row.user_data.id,
      email: row.user_data.email,
      first_name: row.user_data.full_name.split(' ')[0],
      last_name: row.user_data.full_name.split(' ').slice(1).join(' '),
      full_name: row.user_data.full_name
    },
    tier: {
      id: row.tier_data.id,
      name: row.tier_data.name,
      price: row.tier_data.price,
      activation_type: (row.tier_data.activation_type as MembershipActivationType) || MembershipActivationType.AUTOMATIC
    },
    group: row.group
  }));
}

export async function getRejectedApplications(groupId: string): Promise<Application[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('applications_view')
    .select()
    .eq('group_id', groupId)
    .not('rejected_at', 'is', null)
    .order('rejected_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as ApplicationView[]).map(row => ({
    id: row.id,
    user_id: row.user_id,
    tier_id: row.tier_id,
    group_id: row.group_id,
    is_active: row.is_active,
    created_at: row.created_at,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    status: row.status,
    user: {
      id: row.user_data.id,
      email: row.user_data.email,
      first_name: row.user_data.full_name.split(' ')[0],
      last_name: row.user_data.full_name.split(' ').slice(1).join(' '),
      full_name: row.user_data.full_name
    },
    tier: {
      id: row.tier_data.id,
      name: row.tier_data.name,
      price: row.tier_data.price,
      activation_type: (row.tier_data.activation_type as MembershipActivationType) || MembershipActivationType.AUTOMATIC
    },
    group: row.group
  }));
} 