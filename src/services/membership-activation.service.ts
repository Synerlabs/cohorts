import { createClient, createServiceRoleClient } from '@/lib/utils/supabase/server';
import { MembershipActivationType, MembershipStatus } from '@/lib/types/membership';
import { Database } from '@/lib/types/database.types';

type GroupUser = Database['public']['Tables']['group_users']['Row'];
type Application = Database['public']['Tables']['applications']['Row'] & {
  tier?: {
    membership_tiers?: {
      duration_months: number;
      activation_type: MembershipActivationType;
      form_template_id?: string | null;
    }[];
  };
};

/**
 * Service class for handling membership activation across different activation types
 * This centralizes the logic that was previously spread across multiple services
 */
export class MembershipActivationService {
  /**
   * Creates a membership record and activates the group user
   * @param groupUserId The ID of the group user
   * @param tierId The ID of the membership tier
   * @param orderId Optional order ID for paid memberships
   * @param applicationId Optional application ID
   * @returns The created membership record
   */
  static async createMembership({
    groupUserId,
    tierId,
    orderId = null,
    applicationId = null,
    durationMonths = 12
  }: {
    groupUserId: string;
    tierId: string;
    orderId?: string | null;
    applicationId?: string | null;
    durationMonths?: number;
  }) {
    console.log('🔄 Creating membership record:', {
      groupUserId,
      tierId,
      orderId,
      applicationId,
      durationMonths
    });

    const supabase = await createServiceRoleClient();

    // Calculate membership dates
    const startDate = new Date();
    const endDate = durationMonths ? 
      new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000) : 
      null;

    console.log('📅 Calculated membership dates:', {
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString() || null,
      durationMonths
    });

    // Check if membership already exists
    const { data: existingMembership, error: existingError } = await supabase
      .from('memberships')
      .select('id, group_user_id, order_id, status')
      .eq('group_user_id', groupUserId)
      .eq('status', 'active')
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('❌ Failed to check existing membership:', {
        error: existingError,
        groupUserId
      });
      throw new Error(`Failed to check existing membership: ${existingError.message}`);
    }

    if (existingMembership) {
      console.log('⚠️ Active membership already exists:', {
        id: existingMembership.id,
        groupUserId: existingMembership.group_user_id,
        orderId: existingMembership.order_id
      });
      
      // Ensure the group user is activated even if membership already exists
      await this.activateGroupUser(groupUserId);
      
      // Return the existing membership
      return existingMembership;
    }

    // If no order ID is provided, we need to create a dummy order for automatic activations
    if (!orderId) {
      console.log('⚠️ No order ID provided, creating a dummy order for automatic activation');
      
      try {
        // First, get the group_id and user_id from the group_user
        const { data: groupUser, error: groupUserError } = await supabase
          .from('group_users')
          .select('user_id, group_id')
          .eq('id', groupUserId)
          .single();
          
        if (groupUserError) {
          console.error('❌ Failed to get group user:', {
            error: groupUserError,
            groupUserId
          });
          throw new Error(`Failed to get group user: ${groupUserError.message}`);
        }
        
        // Get the product details to set the correct price (usually 0 for automatic)
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('price, currency')
          .eq('id', tierId)
          .single();
          
        if (productError) {
          console.error('❌ Failed to get product:', {
            error: productError,
            tierId
          });
          throw new Error(`Failed to get product: ${productError.message}`);
        }
        
        // Create a dummy order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            type: 'membership',
            user_id: groupUser.user_id,
            status: 'completed',
            amount: product.price || 0,
            currency: product.currency || 'USD',
            group_id: groupUser.group_id,
            completed_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (orderError) {
          console.error('❌ Failed to create dummy order:', {
            error: orderError
          });
          throw new Error(`Failed to create dummy order: ${orderError.message}`);
        }
        
        console.log('✅ Created dummy order for automatic activation:', order.id);
        orderId = order.id;
        
        // Create a suborder to link with the product
        const { error: suborderError } = await supabase
          .from('suborders')
          .insert({
            order_id: orderId,
            product_id: tierId,
            status: 'completed',
            amount: product.price || 0,
            currency: product.currency || 'USD',
            completed_at: new Date().toISOString(),
            metadata: {
              group_user_id: groupUserId,
              application_id: applicationId,
              automatic: true
            }
          });
          
        if (suborderError) {
          console.error('❌ Failed to create suborder:', {
            error: suborderError,
            orderId
          });
          // Continue anyway since we have the order_id
        }
        
      } catch (error) {
        console.error('❌ Failed to create dummy order:', error);
        throw new Error(`Failed to create dummy order: ${(error as Error).message}`);
      }
    }

    // Create membership record
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        group_user_id: groupUserId,
        tier_id: tierId,
        order_id: orderId,
        status: MembershipStatus.ACTIVE,
        start_date: startDate.toISOString(),
        end_date: endDate?.toISOString() || null
      })
      .select()
      .single();

    if (membershipError) {
      console.error('❌ Failed to create membership:', {
        error: membershipError,
        groupUserId,
        tierId,
        orderId
      });
      throw new Error(`Failed to create membership: ${membershipError.message}`);
    }

    console.log('✅ Created membership record:', membership.id);

    // Always activate the group user when creating an active membership
    try {
      await this.activateGroupUser(groupUserId);
      console.log('✅ Activated group user for new membership:', groupUserId);
    } catch (activationError) {
      console.error('❌ Failed to activate group user:', {
        error: activationError,
        groupUserId
      });
      // Don't throw here, as the membership was created successfully
      // We'll log the error but return the membership
      console.log('⚠️ Membership created but group user activation failed');
    }

    return membership;
  }

  /**
   * Activates a group user
   * @param groupUserId The ID of the group user to activate
   */
  static async activateGroupUser(groupUserId: string) {
    console.log('🔄 Activating group user:', groupUserId);
    
    const supabase = await createServiceRoleClient();
    
    const { error: userError } = await supabase
      .from('group_users')
      .update({ is_active: true })
      .eq('id', groupUserId);

    if (userError) {
      console.error('❌ Failed to activate group user:', {
        error: userError,
        groupUserId
      });
      throw new Error(`Failed to activate group user: ${userError.message}`);
    }

    console.log('✅ Activated group user:', groupUserId);
  }

  /**
   * Processes an application based on its activation type
   * @param applicationId The ID of the application to process
   * @param activationType The activation type to use (overrides the application's activation type if provided)
   * @returns The updated application
   */
  static async processApplication(applicationId: string, activationType?: MembershipActivationType) {
    console.log('🔄 Processing application:', applicationId);
    
    const supabase = await createServiceRoleClient();
    
    // Get application details
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        tier:tier_id(
          *,
          membership_tiers!inner(*)
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('❌ Failed to get application:', { 
        error: appError,
        applicationId
      });
      throw new Error(`Failed to get application: ${appError?.message || 'Application not found'}`);
    }

    // Use provided activation type or get from application
    const actualActivationType = activationType || 
      application.tier?.membership_tiers?.[0]?.activation_type as MembershipActivationType;
    
    console.log('📋 Application details:', {
      id: application.id,
      status: application.status,
      activationType: actualActivationType,
      groupUserId: application.group_user_id,
      tierId: application.tier_id
    });

    // Determine if we should create a membership now based on activation type and status
    let shouldCreateMembership = false;
    let newStatus = application.status;
    
    // For automatic and form_required, always create membership
    if (actualActivationType === MembershipActivationType.AUTOMATIC || 
        actualActivationType === MembershipActivationType.FORM_REQUIRED) {
      shouldCreateMembership = true;
      newStatus = 'approved';
    }
    // For review_required and form_then_review, create membership if approved
    else if ((actualActivationType === MembershipActivationType.REVIEW_REQUIRED || 
              actualActivationType === MembershipActivationType.FORM_THEN_REVIEW) && 
             application.status === 'approved') {
      console.log('✅ Review-required application is approved, will create membership');
      shouldCreateMembership = true;
    }
    // For payment_required and form_then_payment, create membership if approved
    else if ((actualActivationType === MembershipActivationType.PAYMENT_REQUIRED || 
              actualActivationType === MembershipActivationType.FORM_THEN_PAYMENT) && 
             application.status === 'approved') {
      shouldCreateMembership = true;
    }
    // For complex flows, check specific conditions
    else if (actualActivationType === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW && 
             application.status === 'approved') {
      shouldCreateMembership = true;
    }
    else if (actualActivationType === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT && 
             application.status === 'approved') {
      shouldCreateMembership = true;
    }
    else if (actualActivationType === MembershipActivationType.REVIEW_THEN_PAYMENT && 
             application.status === 'approved') {
      shouldCreateMembership = true;
    }
    
    // Special case: If we're explicitly processing a review_required application,
    // force membership creation if the application is approved
    if ((activationType === MembershipActivationType.REVIEW_REQUIRED || 
         activationType === MembershipActivationType.FORM_THEN_REVIEW) && 
        application.status === 'approved') {
      console.log('🔄 Explicitly processing review_required application, forcing membership creation');
      shouldCreateMembership = true;
    }
    
    // IMPORTANT: Always create membership for approved applications regardless of activation type
    if (application.status === 'approved') {
      console.log('✅ Application is approved, ensuring membership is created');
      shouldCreateMembership = true;
    }

    // Update application status if needed
    if (newStatus !== application.status) {
      const now = new Date().toISOString();
      
      const { data: updatedApp, error: updateError } = await supabase
        .from('applications')
        .update({
          status: newStatus,
          approved_at: newStatus === 'approved' ? now : application.approved_at,
          updated_at: now
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update application status:', {
          error: updateError,
          applicationId,
          newStatus
        });
        throw new Error(`Failed to update application status: ${updateError.message}`);
      }

      console.log('✅ Updated application status:', {
        id: applicationId,
        oldStatus: application.status,
        newStatus
      });
    }

    // Create membership if needed
    if (shouldCreateMembership) {
      console.log('🔄 Creating membership for application:', applicationId);
      
      try {
        const durationMonths = application.tier?.membership_tiers?.[0]?.duration_months || 12;
        
        // Check if membership already exists
        const membershipExists = await this.verifyMembershipCreated(applicationId);
        
        if (membershipExists) {
          console.log('⚠️ Membership already exists for application:', applicationId);
          
          // Ensure the group user is activated even if membership already exists
          await this.activateGroupUser(application.group_user_id);
        } else {
          // Create new membership
          const membership = await this.createMembership({
            groupUserId: application.group_user_id,
            tierId: application.tier_id,
            applicationId: application.id,
            durationMonths
          });

          console.log('✅ Created membership for application:', {
            applicationId,
            membershipId: membership.id
          });
        }
        
        // Double-check that the group user is activated
        const isActive = await this.verifyGroupUserActive(application.group_user_id);
        if (!isActive) {
          console.log('⚠️ Group user not active after membership creation, activating explicitly');
          await this.activateGroupUser(application.group_user_id);
        }
        
        console.log('✅ Processed application successfully:', {
          applicationId,
          groupUserId: application.group_user_id
        });
      } catch (error) {
        console.error('❌ Failed to create membership for application:', {
          error,
          applicationId
        });
        throw error;
      }
    } else {
      console.log('⏭️ Skipping membership creation for application:', {
        id: applicationId,
        status: application.status,
        activationType: actualActivationType
      });
    }

    return application;
  }

  /**
   * Processes a membership from a suborder
   * @param applicationId The ID of the application
   * @param orderId The ID of the order
   * @returns The created membership
   */
  static async processFromSuborder(applicationId: string, orderId: string) {
    console.log('🔄 Processing membership from suborder:', {
      applicationId,
      orderId
    });
    
    const supabase = await createServiceRoleClient();
    
    // Get application details
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        tier:tier_id(
          *,
          membership_tiers!inner(*)
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('❌ Failed to get application:', { 
        error: appError,
        applicationId
      });
      throw new Error(`Failed to get application: ${appError?.message || 'Application not found'}`);
    }

    console.log('🔍 Application details:', application);

    // Check the activation type to determine the correct flow
    const activationType = application.tier?.membership_tiers?.activation_type;
    console.log('🔍 Application activation type:', activationType);
    console.log('🔍 Current application status:', application.status);

    // For form_then_payment_then_review, set status to pending after payment
    if (activationType === 'form_then_payment_then_review') {
      console.log('ℹ️ Payment received for form_then_payment_then_review application, setting to pending for admin review');
      
      // Only update if the current status is 'pending_payment'
      // This prevents changing the status if it's already been set to something else
      if (application.status === 'pending_payment') {
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            status: 'pending', // Set to pending instead of approved
            updated_at: now,
            order_id: orderId // Store the order ID for reference
          })
          .eq('id', applicationId);

        if (updateError) {
          console.error('❌ Failed to update application status:', {
            error: updateError,
            applicationId
          });
          throw new Error(`Failed to update application status: ${updateError.message}`);
        }

        console.log('✅ Updated application status to pending for admin review:', applicationId);
      } else {
        console.log(`⚠️ Application ${applicationId} status is ${application.status}, not updating to pending`);
      }
      
      // For this type, we don't create a membership or activate the group user yet
      // Return early with the updated application
      const { data: updatedApp } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();
        
      return updatedApp;
    }
    
    // For form_then_review_then_payment, we've already reviewed the application
    // and now we're completing the payment, so we should create the membership
    if (activationType === 'form_then_review_then_payment') {
      console.log('ℹ️ Payment received for form_then_review_then_payment application, finalizing membership');
      
      // Only update if the current status is 'pending_payment'
      // This prevents changing the status if it's already been set to something else
      if (application.status === 'pending_payment') {
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            status: 'approved', // Set to approved since it's already been reviewed
            approved_at: now,
            updated_at: now,
            order_id: orderId // Store the order ID for reference
          })
          .eq('id', applicationId);

        if (updateError) {
          console.error('❌ Failed to update application status:', {
            error: updateError,
            applicationId
          });
          throw new Error(`Failed to update application status: ${updateError.message}`);
        }

        console.log('✅ Updated application status to approved after payment:', applicationId);
      } else {
        console.log(`⚠️ Application ${applicationId} status is ${application.status}, not updating to approved`);
      }
      
      // Continue with membership creation since this application has been reviewed and paid
    }

    // For all other types, proceed with the normal flow (approve and create membership)
    const now = new Date().toISOString();
    
    // Only update if the current status is 'pending_payment' and it's not form_then_review_then_payment
    // (which we already handled above)
    if (application.status === 'pending_payment' && activationType !== 'form_then_review_then_payment') {
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          status: 'approved',
          approved_at: now,
          updated_at: now,
          order_id: orderId // Store the order ID for reference
        })
        .eq('id', applicationId);

      if (updateError) {
        console.error('❌ Failed to update application status:', {
          error: updateError,
          applicationId
        });
        throw new Error(`Failed to update application status: ${updateError.message}`);
      }

      console.log('✅ Updated application status to approved:', applicationId);
    } else if (activationType !== 'form_then_review_then_payment') {
      console.log(`⚠️ Application ${applicationId} status is ${application.status}, not updating to approved`);
    }

    // Check if membership already exists
    const membershipExists = await this.verifyMembershipCreated(applicationId);
    
    if (membershipExists) {
      console.log('⚠️ Membership already exists for application:', applicationId);
      
      // Get the group_user_id from the application
      const { data: appData } = await supabase
        .from('applications')
        .select('group_user_id')
        .eq('id', applicationId)
        .single();
        
      if (appData) {
        // Ensure the group user is activated even if membership already exists
        await this.activateGroupUser(appData.group_user_id);
        
        // Get the existing membership to return
        const { data: existingMembership } = await supabase
          .from('memberships')
          .select('*')
          .eq('group_user_id', appData.group_user_id)
          .eq('tier_id', application.tier_id)
          .eq('status', 'active')
          .single();
          
        if (existingMembership) {
          console.log('✅ Found existing membership:', existingMembership.id);
          return existingMembership;
        }
      }
    }

    // Create membership
    const durationMonths = application.tier?.membership_tiers?.[0]?.duration_months || 12;
    
    const membership = await this.createMembership({
      groupUserId: application.group_user_id,
      tierId: application.tier_id,
      orderId,
      applicationId,
      durationMonths
    });

    console.log('✅ Created membership from suborder:', {
      applicationId,
      orderId,
      membershipId: membership.id
    });
    
    // Double-check that the group user is activated
    const isActive = await this.verifyGroupUserActive(application.group_user_id);
    if (!isActive) {
      console.log('⚠️ Group user not active after membership creation, activating explicitly');
      await this.activateGroupUser(application.group_user_id);
    }

    return membership;
  }

  /**
   * Verifies that a membership was created for an application
   * @param applicationId The ID of the application
   * @returns True if a membership exists, false otherwise
   */
  static async verifyMembershipCreated(applicationId: string): Promise<boolean> {
    console.log('🔍 Verifying membership for application:', applicationId);
    
    const supabase = await createServiceRoleClient();
    
    // First get the group_user_id from the application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('group_user_id, tier_id')
      .eq('id', applicationId)
      .single();
      
    if (appError) {
      console.error('❌ Error fetching application:', {
        error: appError,
        applicationId
      });
      throw new Error(`Failed to fetch application: ${appError.message}`);
    }
    
    if (!application) {
      console.error('❌ Application not found:', applicationId);
      return false;
    }
    
    // Now check if there's a membership for this group_user_id and tier_id
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('id')
      .eq('group_user_id', application.group_user_id)
      .eq('tier_id', application.tier_id)
      .eq('status', 'active')
      .single();

    if (membershipError && membershipError.code !== 'PGRST116') {
      console.error('❌ Error checking membership:', {
        error: membershipError,
        applicationId,
        groupUserId: application.group_user_id
      });
      throw new Error(`Failed to verify membership: ${membershipError.message}`);
    }

    const exists = !!membership;
    console.log(`${exists ? '✅' : '❌'} Membership ${exists ? 'exists' : 'does not exist'} for application:`, applicationId);
    
    return exists;
  }

  /**
   * Verifies that a group user is active
   * @param groupUserId The ID of the group user
   * @returns True if the group user is active, false otherwise
   */
  static async verifyGroupUserActive(groupUserId: string): Promise<boolean> {
    console.log('🔍 Verifying group user activation:', groupUserId);
    
    const supabase = await createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('group_users')
      .select('is_active')
      .eq('id', groupUserId)
      .single();

    if (error) {
      console.error('❌ Error checking group user:', {
        error,
        groupUserId
      });
      throw new Error(`Failed to verify group user: ${error.message}`);
    }

    const isActive = data?.is_active || false;
    console.log(`${isActive ? '✅' : '❌'} Group user is ${isActive ? 'active' : 'not active'}:`, groupUserId);
    
    return isActive;
  }
} 