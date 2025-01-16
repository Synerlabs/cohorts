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

type ApplicationView = Database['public']['Views']['applications_view']['Row'];

export async function getPendingApplications(groupId: string): Promise<Application[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('applications_view')
    .select()
    .eq('group_id', groupId)
    .eq('is_active', false)
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

  // Only activate if it's free or doesn't require payment after review
  const shouldActivate = price === 0 || 
    activationType !== MembershipActivationType.REVIEW_THEN_PAYMENT;

  const { error: updateError } = await supabase
    .from('user_membership')
    .update({ 
      is_active: shouldActivate,
      approved_at: new Date().toISOString()
    })
    .eq('id', applicationId);

  if (updateError) throw updateError;

  return application as ApplicationView;
}

export async function rejectApplication(applicationId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('user_membership')
    .delete()
    .eq('id', applicationId);

  if (error) throw error;
} 