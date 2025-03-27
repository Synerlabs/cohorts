import { createClient } from "@/lib/utils/supabase/server";
import { Database } from "@/lib/types/database.types";
import { OrderService } from "./order.service";
import { ProductService } from "./product.service";
import { MembershipActivationType } from "@/lib/types/membership";
import { MembershipActivationService } from './membership-activation.service';

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
  application_id: string;
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
    .eq('application_id', applicationId)
    .single();

  if (applicationError) throw applicationError;
  if (!application) throw new Error('Application not found');

  const now = new Date().toISOString();

  // Special handling for form_then_payment_then_review
  // If payment has already been made (order_id exists), we should create the membership
  const isFormThenPaymentThenReview = application.activation_type === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW;
  const hasPayment = !!application.order_id;
  
  if (isFormThenPaymentThenReview) {
    console.log(`Processing form_then_payment_then_review application: ${applicationId}, Payment status: ${hasPayment ? 'Paid' : 'Not paid'}`);
  }

  // Determine if we should activate the membership now
  // We should activate if:
  // 1. It's a free membership OR
  // 2. It's a paid membership but doesn't require payment first OR
  // 3. It's form_then_payment_then_review and payment has been made
  const shouldActivate = application.product_price === 0 || 
    ![
      MembershipActivationType.PAYMENT_REQUIRED,
      MembershipActivationType.REVIEW_THEN_PAYMENT,
      MembershipActivationType.FORM_THEN_PAYMENT,
      MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW,
      MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
    ].includes(application.activation_type as MembershipActivationType) ||
    (isFormThenPaymentThenReview && hasPayment);

  // Determine the new status
  // We should set to pending_payment if:
  // 1. It's a paid membership AND
  // 2. The activation type requires payment after approval AND
  // 3. It's not form_then_payment_then_review with payment already made
  const newStatus = (application.product_price > 0 && 
    [
      MembershipActivationType.REVIEW_THEN_PAYMENT,
      MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
    ].includes(application.activation_type as MembershipActivationType) &&
    !(isFormThenPaymentThenReview && hasPayment))
    ? 'pending_payment' 
    : 'approved';

  // Update the application status
  const { error: updateError } = await supabase
    .from('applications')
    .update({
      status: newStatus,
      approved_at: now,
      updated_at: now
    })
    .eq('id', applicationId);

  if (updateError) throw updateError;

  console.log(`Application ${applicationId} approved with status: ${newStatus}`);
  console.log(`Activation type: ${application.activation_type}, Should activate: ${shouldActivate}`);

  // If we should activate the membership now, use the MembershipActivationService
  if (shouldActivate || newStatus === 'approved') {
    try {
      console.log(`Processing application ${applicationId} for membership creation`);
      
      // Only process the application when status is approved AND it's not form_then_review_then_payment
      // or when shouldActivate is true
      if ((newStatus === 'approved' && 
           application.activation_type !== MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT) || 
          shouldActivate) {
        await MembershipActivationService.processApplication(applicationId);
      }
      
      // Verify that membership was created
      const membershipCreated = await MembershipActivationService.verifyMembershipCreated(applicationId);
      if (!membershipCreated && newStatus === 'approved' && 
          application.activation_type !== MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT) {
        console.log(`Membership was not created for application ${applicationId} after approval, trying again...`);
        
        // Try again with explicit activation type
        await MembershipActivationService.processApplication(
          applicationId, 
          application.activation_type as MembershipActivationType
        );
        
        // Check again
        const retryMembershipCreated = await MembershipActivationService.verifyMembershipCreated(applicationId);
        if (!retryMembershipCreated) {
          console.error(`Failed to create membership for application ${applicationId} after multiple attempts`);
          
          // Last resort: try direct membership creation
          const { data: appData } = await supabase
            .from('applications')
            .select('group_user_id, tier_id')
            .eq('id', applicationId)
            .single();
            
            if (appData) {
              console.log(`Attempting direct membership creation for application ${applicationId}`);
              
              // Get the tier information to determine its type
              const tier = await ProductService.getMembershipTier(appData.tier_id);
              const tierType = tier.membership_tier.type || 'membership';
              
              await MembershipActivationService.createMembership({
                groupUserId: appData.group_user_id,
                tierId: appData.tier_id,
                applicationId: applicationId,
                durationMonths: application.duration_months || 12,
                tierType: tierType
              });
            }
        }
      }
      
      // Verify that group user is active
      const { data: appData } = await supabase
        .from('applications')
        .select('group_user_id')
        .eq('id', applicationId)
        .single();
        
      if (appData) {
        const isActive = await MembershipActivationService.verifyGroupUserActive(appData.group_user_id);
        if (!isActive && newStatus === 'approved') {
          console.log(`Group user ${appData.group_user_id} is not active after application approval, activating...`);
          
          // Get the tier information to determine its type
          const tier = await ProductService.getMembershipTier(application.tier_id);
          const tierType = tier.membership_tier.type || 'membership';
          
          // Only activate for membership-type tiers
          if (tierType === 'membership') {
            // Activate explicitly
            await MembershipActivationService.activateGroupUser(appData.group_user_id);
          } else {
            console.log(`ℹ️ Skipping user activation for organization-type tier for group user ${appData.group_user_id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing application:', error);
      // Log error but don't throw, as the application status update was successful
      console.log(`Application ${applicationId} status updated to ${newStatus}, but membership processing failed`);
    }
  }

  // Fetch the updated record
  const { data: updatedApplication, error: fetchError } = await supabase
    .from('membership_applications_view')
    .select()
    .eq('application_id', applicationId)
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
    .eq('application_id', applicationId)
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
  productId: string,
  formData?: Record<string, any>,
  externalMetadata?: Record<string, any>
): Promise<Application> {
  const supabase = await createClient();

  console.log('Creating membership application:', { groupUserId, productId });
  
  if (!groupUserId) {
    console.error('Missing group_user_id in createMembershipApplication');
    throw new Error('Missing group_user_id');
  }

  // Get product details to determine initial status
  const product = await ProductService.getMembershipTier(productId);
  if (!product) throw new Error('Product not found');

  // Get the user_id from group_users
  const { data: groupUser, error: groupUserError } = await supabase
    .from('group_users')
    .select('user_id, group_id')
    .eq('id', groupUserId)
    .single();

  if (groupUserError) {
    console.error('Error fetching group user in createMembershipApplication:', groupUserError);
    throw groupUserError;
  }
  
  if (!groupUser) {
    console.error('Group user not found with id:', groupUserId);
    throw new Error('Group user not found');
  }

  // Check if this is an organization-type tier
  const isOrganizationTier = product.membership_tier.type === 'organization';
  
  // For organization tiers, we'll use externalMetadata to store the organization info

  let initialStatus: Application['status'];
  const isAutomatic = product.membership_tier.activation_type === 'automatic';
  const isFormRequired = product.membership_tier.activation_type === 'form_required';
  const shouldCreateMembership = isAutomatic || isFormRequired;
  
  switch (product.membership_tier.activation_type) {
    case 'automatic':
    case 'form_required':
      initialStatus = 'approved';
      break;
    case 'review_required':
    case 'form_then_review':
    case 'form_then_review_then_payment':
      initialStatus = 'pending';
      break;
    case 'payment_required':
    case 'form_then_payment':
    case 'form_then_payment_then_review':
      initialStatus = 'pending_payment';
      break;
    case 'review_then_payment':
      initialStatus = 'pending';
      break;
    default:
      initialStatus = 'pending';
  }

  let formResponseId: string | null = null;

  // If form data is provided and there's a form template, store it in form_responses
  if (formData && product.membership_tier.form_template_id) {
    const { data: formResponse, error: formResponseError } = await supabase
      .from('form_responses')
      .insert({
        template_id: product.membership_tier.form_template_id,
        response_data: formData,
        submitted_by: groupUser.user_id
      })
      .select()
      .single();

    if (formResponseError) throw formResponseError;
    formResponseId = formResponse.id;
  }
  
  // Use external metadata if provided
  const metadata = externalMetadata || null;
  
  // Create the application with metadata
  console.log('Creating application with status:', initialStatus);
  const { data: newApplication, error: insertError } = await supabase
    .from('applications')
    .insert({
      group_user_id: groupUserId,
      tier_id: productId,
      status: initialStatus,
      form_response_id: formResponseId,
      type: 'membership',
      approved_at: isAutomatic ? new Date().toISOString() : null,
      metadata: metadata
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error creating application:', insertError);
    throw insertError;
  }
  
  if (!newApplication) {
    console.error('Failed to create application, no data returned');
    throw new Error('Failed to create application');
  }

  console.log('Created application:', newApplication);

  // For automatic activation or form_required, create a membership record immediately
  if (shouldCreateMembership) {
    console.log(`${product.membership_tier.activation_type} activation: Creating membership record`);
    
    try {
      // Use the MembershipActivationService to create the membership
      const membership = await MembershipActivationService.createMembership({
        groupUserId,
        tierId: productId,
        applicationId: newApplication.id,
        durationMonths: product.membership_tier.duration_months,
        tierType: product.membership_tier.type || 'membership'
      });

      console.log(`Created membership for ${product.membership_tier.activation_type} activation:`, membership);
    } catch (error) {
      console.error(`Error creating membership for ${product.membership_tier.activation_type} activation:`, error);
      throw error;
    }
  }

  // Fetch the full application details from the view
  const { data: application, error: viewError } = await supabase
    .from('membership_applications_view')
    .select()
    .eq('application_id', newApplication.id)
    .single();

  if (viewError) {
    console.error('Error fetching application details:', viewError);
    throw viewError;
  }
  
  if (!application) {
    console.error('Failed to fetch application details, no data returned');
    throw new Error('Failed to fetch application details');
  }

  return mapViewToApplication(application as ApplicationView);
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

export async function getUserMembershipApplicationsWithPagination(
  userId: string, 
  groupId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{applications: Application[], total: number}> {
  const supabase = await createClient();
  
  // First get the count of all user applications
  const { count, error: countError } = await supabase
    .from('membership_applications_view')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('group_id', groupId);
    
  if (countError) throw countError;
  
  // Then get the paginated data
  const { data, error } = await supabase
    .from('membership_applications_view')
    .select()
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  
  return {
    applications: data ? (data as ApplicationView[]).map(mapViewToApplication) : [],
    total: count || 0
  };
}

function mapViewToApplication(row: ApplicationView): Application {
  return {
    id: row.application_id,
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