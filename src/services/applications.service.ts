import { createClient } from "@/lib/utils/supabase/server";
import { MembershipActivationType } from "@/lib/types/membership";
import { Database } from "@/types/database.types";

export type Application = {
  id: string;
  user_id: string;
  membership_id: string;
  group_id: string;
  is_active: boolean;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  membership: {
    id: string;
    name: string;
    price: number;
    activation_type: MembershipActivationType;
  };
};

type ApplicationView = {
  id: string;
  user_id: string;
  membership_id: string;
  group_id: string;
  is_active: boolean;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  user_data: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  membership_data: {
    id: string;
    name: string;
    price: number;
    activation_type: string;
    duration_months: number;
  };
};

export async function getPendingApplications(groupId: string): Promise<Application[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('applications_view')
    .select()
    .eq('group_id', groupId)
    .or(`is_active.eq.false,and(approved_at.not.is.null,or(membership_data->>'activation_type'.eq.'payment_required',membership_data->>'activation_type'.eq.'review_then_payment'))`)
    .is('rejected_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as ApplicationView[]).map(row => ({
    id: row.id,
    user_id: row.user_id,
    membership_id: row.membership_id,
    group_id: row.group_id,
    is_active: row.is_active,
    created_at: row.created_at,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    user: {
      id: row.user_data.id,
      email: row.user_data.email,
      full_name: `${row.user_data.first_name} ${row.user_data.last_name}`.trim()
    },
    membership: {
      id: row.membership_data.id,
      name: row.membership_data.name,
      price: row.membership_data.price,
      activation_type: (row.membership_data.activation_type as MembershipActivationType) || MembershipActivationType.AUTOMATIC
    }
  }));
}

export async function approveApplication(applicationId: string) {
  const supabase = await createClient();

  const { data: application, error: applicationError } = await supabase
    .from('applications_view')
    .select()
    .eq('id', applicationId)
    .single();

  if (applicationError) throw applicationError;
  if (!application) throw new Error('Application not found');

  const activationType = (application as ApplicationView).membership_data.activation_type as MembershipActivationType;
  const price = (application as ApplicationView).membership_data.price;

  // Only activate if it's free or doesn't require payment
  const shouldActivate = price === 0 || 
    (activationType !== MembershipActivationType.PAYMENT_REQUIRED && 
     activationType !== MembershipActivationType.REVIEW_THEN_PAYMENT);

  console.log('Approval Debug:', {
    applicationId,
    price,
    activationType,
    shouldActivate,
    application
  });

  // First check if we can find the record
  const { data: membership, error: membershipError } = await supabase
    .from('user_membership')
    .select('*')
    .eq('id', applicationId)
    .single();

  console.log('Found membership:', membership);

  if (membershipError) {
    console.error('Membership Error:', membershipError);
    throw membershipError;
  }

  // Now try to update it
  const { error: updateError } = await supabase
    .from('user_membership')
    .update({
      is_active: shouldActivate,
      approved_at: new Date().toISOString()
    })
    .eq('id', applicationId)
    .eq('user_id', application.user_id)
    .eq('membership_id', application.membership_id);

  if (updateError) {
    console.error('Update Error:', updateError);
    throw updateError;
  }

  // Fetch the updated record
  const { data: updatedApplication, error: fetchError } = await supabase
    .from('applications_view')
    .select()
    .eq('id', applicationId)
    .single();

  if (fetchError) {
    console.error('Fetch Error:', fetchError);
    throw fetchError;
  }

  console.log('Update Debug:', { updateError, updatedApplication });

  return updatedApplication as ApplicationView;
}

export async function rejectApplication(applicationId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('user_membership')
    .update({
      is_active: false,
      rejected_at: new Date().toISOString()
    })
    .eq('id', applicationId);

  if (error) throw error;

  // Fetch the updated record
  const { data: updatedApplication, error: fetchError } = await supabase
    .from('applications_view')
    .select()
    .eq('id', applicationId)
    .single();

  if (fetchError) {
    console.error('Fetch Error:', fetchError);
    throw fetchError;
  }

  return updatedApplication as ApplicationView;
}

export async function getApprovedApplications(groupId: string): Promise<Application[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('applications_view')
    .select()
    .eq('group_id', groupId)
    .not('approved_at', 'is', null)
    .is('rejected_at', null)
    .order('approved_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return (data as ApplicationView[]).map(row => ({
    id: row.id,
    user_id: row.user_id,
    membership_id: row.membership_id,
    group_id: row.group_id,
    is_active: row.is_active,
    created_at: row.created_at,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    user: {
      id: row.user_data.id,
      email: row.user_data.email,
      full_name: `${row.user_data.first_name} ${row.user_data.last_name}`.trim()
    },
    membership: {
      id: row.membership_data.id,
      name: row.membership_data.name,
      price: row.membership_data.price,
      activation_type: (row.membership_data.activation_type as MembershipActivationType) || MembershipActivationType.AUTOMATIC
    }
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
    membership_id: row.membership_id,
    group_id: row.group_id,
    is_active: row.is_active,
    created_at: row.created_at,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    user: {
      id: row.user_data.id,
      email: row.user_data.email,
      full_name: `${row.user_data.first_name} ${row.user_data.last_name}`.trim()
    },
    membership: {
      id: row.membership_data.id,
      name: row.membership_data.name,
      price: row.membership_data.price,
      activation_type: (row.membership_data.activation_type as MembershipActivationType) || MembershipActivationType.AUTOMATIC
    }
  }));
} 