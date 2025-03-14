import { createClient, createServiceRoleClient } from '@/lib/utils/supabase/server';
import { MembershipActivationType, MembershipStatus } from '@/lib/types/membership';
import { Database } from '@/lib/types/database.types';
import { ProductService } from './product.service';
import { calculateMembershipDates, MembershipTierSettings } from '@/lib/utils/membership-dates';

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
   * @param durationMonths The duration of the membership in months
   * @param startDate The start date of the membership
   * @param tierType The type of tier (default: 'membership')
   * @returns The created membership record
   */
  static async createMembership({
    groupUserId,
    tierId,
    orderId = null,
    applicationId = null,
    durationMonths = 12,
    startDate = new Date(),
    tierType = 'membership'
  }: {
    groupUserId: string;
    tierId: string;
    orderId?: string | null;
    applicationId?: string | null;
    durationMonths?: number;
    startDate?: Date;
    tierType?: 'membership' | 'organization';
  }) {
    console.log('🔄 Creating membership record:', {
      groupUserId,
      tierId,
      orderId,
      applicationId,
      durationMonths,
      startDate
    });

    const supabase = await createServiceRoleClient();

    // Get tier settings to determine how to calculate end date
    const { data: tierSettings, error: tierError } = await supabase
      .from('membership_tiers')
      .select(`
        duration_months,
        duration_unit,
        has_fixed_dates,
        fixed_start_date,
        fixed_end_date,
        is_fiscal_period,
        fiscal_start_month,
        fiscal_start_day,
        has_monthly_cycle,
        monthly_start_day,
        monthly_end_day_type,
        monthly_end_day
      `)
      .eq('product_id', tierId)
      .single();

    if (tierError) {
      console.error('❌ Failed to fetch tier settings:', {
        error: tierError,
        tierId
      });
      throw new Error(`Failed to fetch tier settings: ${tierError.message}`);
    }

    // Use the shared utility to calculate start and end dates
    const { startDate: actualStartDate, endDate } = calculateMembershipDates(
      tierSettings as MembershipTierSettings,
      startDate
    );
    
    console.log('✅ Calculated membership dates:', {
      startDate: actualStartDate,
      endDate
    });

    // Check for existing active membership with the same tier
    const { data: existingMembership, error: existingError } = await supabase
      .from('memberships')
      .select('*')
      .eq('group_user_id', groupUserId)
      .eq('tier_id', tierId)
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
      console.log('⚠️ Active membership already exists for this tier:', {
        id: existingMembership.id,
        groupUserId: existingMembership.group_user_id,
        tierId: existingMembership.tier_id,
        orderId: existingMembership.order_id
      });
      
      // Ensure the group user is activated only for membership-type tiers
      if (tierType === 'membership') {
        await this.activateGroupUser(groupUserId);
        console.log('✅ Activated group user for existing membership:', groupUserId);
      } else {
        console.log('ℹ️ Skipping user activation for organization-type tier with existing membership');
      }
      
      // Return the existing membership
      return existingMembership;
    }
    
    // If no order ID is provided, create a dummy order
    if (!orderId) {
      console.log('⚠️ No order ID provided, creating a dummy order');
      
      try {
        // Get the group_user details to get user_id and group_id
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
        
        // Get product details for the tier
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
        
        // Create dummy order
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
        
        console.log('✅ Created dummy order:', order.id);
        
        // Create suborder with metadata
        const { error: suborderError } = await supabase
          .from('suborders')
          .insert({
            order_id: order.id,
            status: 'completed',
            product_id: tierId,
            amount: product.price || 0,
            currency: product.currency || 'USD',
            type: 'membership',
            completed_at: new Date().toISOString(),
            metadata: {
              is_dummy: true,
              application_id: applicationId,
              automatic: true,
              group_user_id: groupUserId
            }
          });
          
        if (suborderError) {
          console.error('❌ Failed to create suborder:', {
            error: suborderError,
            orderId: order.id
          });
          throw new Error(`Failed to create suborder: ${suborderError.message}`);
        }
        
        orderId = order.id;
      } catch (error) {
        console.error('❌ Failed to create dummy order:', error);
        throw new Error(`Failed to create dummy order: ${(error as Error).message}`);
      }
    }
    
    // Create new membership
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        group_user_id: groupUserId,
        tier_id: tierId,
        status: 'active',
        start_date: actualStartDate.toISOString(),
        end_date: endDate.toISOString(),
        order_id: orderId,
        metadata: applicationId ? { application_id: applicationId } : null
      })
      .select()
      .single();

    if (membershipError) {
      console.error('❌ Failed to create membership:', {
        error: membershipError,
        groupUserId,
        tierId
      });
      throw new Error(`Failed to create membership: ${membershipError.message}`);
    }

    if (!membership) {
      console.error('❌ Failed to create membership, no data returned:', {
        groupUserId,
        tierId
      });
      throw new Error('Failed to create membership, no data returned');
    }

    console.log('✅ Created membership:', {
      id: membership.id,
      groupUserId: membership.group_user_id,
      tierId: membership.tier_id,
      startDate: membership.start_date,
      endDate: membership.end_date
    });

    // Only activate the group user for membership-type tiers
    if (tierType === 'membership') {
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
    } else {
      console.log('ℹ️ Skipping user activation for organization-type tier');
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
    else if (actualActivationType === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT) {
      // For form_then_review_then_payment, only create membership if status is approved AND payment has been made
      // Check if payment has been made by looking for order_id
      if (application.status === 'approved' && application.order_id) {
        shouldCreateMembership = true;
      } else {
        shouldCreateMembership = false;
      }
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
    // EXCEPT for form_then_review_then_payment which requires payment first
    if (application.status === 'approved') {
      if (actualActivationType === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT) {
        // For form_then_review_then_payment, only create membership if payment has been made
        if (application.order_id) {
          console.log('✅ Application is approved and payment has been made, creating membership');
          shouldCreateMembership = true;
        } else {
          console.log('⚠️ Application is approved but payment has not been made, not creating membership yet');
          shouldCreateMembership = false;
        }
      } else {
        console.log('✅ Application is approved, ensuring membership is created');
        shouldCreateMembership = true;
      }
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
          
          // Use centralized activation function
          await this.activateBasedOnTierType(application.group_user_id, application.tier_id);
        } else {
          // Create new membership
          const membershipTier = await ProductService.getMembershipTier(application.tier_id);
          const tierType = membershipTier.membership_tier.type || 'membership';
          
          const membership = await this.createMembership({
            groupUserId: application.group_user_id,
            tierId: application.tier_id,
            applicationId: application.id,
            durationMonths,
            startDate: new Date(),
            tierType
          });

          console.log('✅ Created membership for application:', {
            applicationId,
            membershipId: membership.id
          });
          
          // Use centralized activation function
          await this.activateBasedOnTierType(application.group_user_id, application.tier_id);
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
      throw new Error(`Failed to get application: ${appError?.message || 'Not found'}`);
    }
    
    // Get tier type
    const tier = await ProductService.getMembershipTier(application.tier_id);
    const tierType = tier.membership_tier.type || 'membership';

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
        .select('group_user_id, tier_id')
        .eq('id', applicationId)
        .single();
        
      if (appData) {
        // Use centralized activation function
        await this.activateBasedOnTierType(appData.group_user_id, appData.tier_id);
        
        // Get the existing membership to return
        const { data: existingMembership } = await supabase
          .from('memberships')
          .select('*')
          .eq('application_id', applicationId)
          .single();
          
        return existingMembership;
      }
    }

    // Create membership if it doesn't exist
    const durationMonths = application.tier?.membership_tiers?.[0]?.duration_months || 12;
    
    // Create the membership
    const membership = await this.createMembership({
      groupUserId: application.group_user_id,
      tierId: application.tier_id,
      applicationId,
      orderId,
      durationMonths,
      startDate: new Date(),
      tierType
    });
    
    console.log('✅ Created membership from suborder:', {
      applicationId,
      orderId,
      membershipId: membership.id
    });
    
    // Use centralized activation function
    await this.activateBasedOnTierType(application.group_user_id, application.tier_id);
    
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

  /**
   * Activates the relationship between two organizations
   * @param groupUserId The ID of the group user representing the organization
   */
  static async activateOrganization(groupUserId: string) {
    console.log('🔄 Activating organization for group user:', groupUserId);
    
    const supabase = await createServiceRoleClient();
    
    // First, fetch the group user to get group details
    const { data: groupUser, error: fetchError } = await supabase
      .from('group_users')
      .select('id, group_id, user_id')
      .eq('id', groupUserId)
      .single();
    
    if (fetchError || !groupUser) {
      console.error('❌ Failed to fetch group user for organization activation:', {
        error: fetchError,
        groupUserId
      });
      throw new Error(`Failed to fetch group user: ${fetchError?.message || 'User not found'}`);
    }

    // Get the application to find tier_id and organization details from metadata
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, tier_id, metadata')
      .eq('group_user_id', groupUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (appError) {
      console.error('❌ Failed to fetch application for organization activation:', {
        error: appError,
        groupUserId
      });
      throw new Error(`Failed to fetch application: ${appError.message}`);
    }
    
    // Get organization ID from metadata
    const organizationId = application.metadata?.organizationId;
    
    // If the organizationId is null, we can't activate it
    if (!organizationId) {
      console.error('❌ Cannot activate organization: organizationId not found in metadata', {
        groupUserId,
        applicationId: application.id
      });
      throw new Error('Cannot activate organization: organizationId not found in metadata');
    }
    
    // Check if relationship already exists
    const { data: existingRelation, error: relError } = await supabase
      .from('group_organization')
      .select('id')
      .eq('parent_group_id', groupUser.group_id)
      .eq('child_group_id', organizationId)
      .maybeSingle();
    
    if (relError) {
      console.error('❌ Error checking existing group_organization relationship:', {
        error: relError,
        parentGroupId: groupUser.group_id,
        childGroupId: organizationId
      });
      throw new Error(`Error checking relationship: ${relError.message}`);
    }
    
    if (existingRelation) {
      // Update existing relationship
      const { error: updateError } = await supabase
        .from('group_organization')
        .update({
          is_active: true,
          tier_id: application.tier_id
        })
        .eq('id', existingRelation.id);
      
      if (updateError) {
        console.error('❌ Failed to update organization relationship:', {
          error: updateError,
          relationId: existingRelation.id
        });
        throw new Error(`Failed to update relationship: ${updateError.message}`);
      }
      
      console.log('✅ Updated organization relationship to active:', {
        groupUserId,
        relationId: existingRelation.id
      });
    } else {
      // Create new relationship
      const { error: insertError } = await supabase
        .from('group_organization')
        .insert({
          parent_group_id: groupUser.group_id,
          child_group_id: organizationId,
          tier_id: application.tier_id,
          is_active: true
        });
      
      if (insertError) {
        console.error('❌ Failed to create organization relationship:', {
          error: insertError,
          parentGroupId: groupUser.group_id,
          childGroupId: organizationId
        });
        throw new Error(`Failed to create relationship: ${insertError.message}`);
      }
      
      console.log('✅ Created active organization relationship:', {
        groupUserId,
        parentGroupId: groupUser.group_id,
        childGroupId: organizationId
      });
    }
  }
  
  /**
   * Verifies if an organization relationship is active
   * @param groupUserId The ID of the group user representing the organization
   * @returns True if the organization relationship is active, false otherwise
   */
  static async verifyOrganizationActive(groupUserId: string): Promise<boolean> {
    console.log('🔍 Verifying if organization relationship is active:', groupUserId);
    
    const supabase = await createServiceRoleClient();
    
    // First, fetch the group user to get group details
    const { data: groupUser, error: fetchError } = await supabase
      .from('group_users')
      .select('id, group_id')
      .eq('id', groupUserId)
      .single();
    
    if (fetchError || !groupUser) {
      console.error('❌ Failed to fetch group user:', {
        error: fetchError,
        groupUserId
      });
      return false;
    }
    
    // Get the application to find the organization ID from metadata
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, metadata')
      .eq('group_user_id', groupUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (appError || !application) {
      console.error('❌ Failed to fetch application for organization verification:', {
        error: appError,
        groupUserId
      });
      return false;
    }
    
    // Get organization ID from metadata
    const organizationId = application.metadata?.organizationId;
    
    if (!organizationId) {
      console.error('❌ Cannot verify organization: organizationId not found in metadata', {
        groupUserId,
        applicationId: application.id
      });
      return false;
    }
    
    // Check if the organization relationship is active
    const { data: relation, error: relError } = await supabase
      .from('group_organization')
      .select('id, is_active')
      .eq('parent_group_id', groupUser.group_id)
      .eq('child_group_id', organizationId)
      .maybeSingle();
    
    if (relError) {
      console.error('❌ Error checking group_organization relationship:', {
        error: relError,
        parentGroupId: groupUser.group_id,
        childGroupId: organizationId
      });
      return false;
    }
    
    // If no relationship exists, it's not active
    if (!relation) {
      console.log('❌ No organization relationship exists:', {
        groupUserId,
        parentGroupId: groupUser.group_id,
        childGroupId: organizationId
      });
      return false;
    }
    
    console.log(`${relation.is_active ? '✅' : '❌'} Organization relationship ${relation.is_active ? 'is' : 'is not'} active:`, {
      groupUserId,
      relationId: relation.id,
      isActive: relation.is_active
    });
    
    return relation.is_active === true;
  }

  /**
   * Activates a user or organization based on tier type
   * This centralized function handles the activation logic for both user and organization tiers
   * @param groupUserId The ID of the group user
   * @param tierId The ID of the membership tier
   */
  static async activateBasedOnTierType(groupUserId: string, tierId: string) {
    console.log('🔄 Activating based on tier type:', { groupUserId, tierId });
    
    try {
      // Get the tier information to determine its type
      const membershipTier = await ProductService.getMembershipTier(tierId);
      if (!membershipTier) {
        throw new Error(`Membership tier ${tierId} not found`);
      }
      
      const tierType = membershipTier.membership_tier.type || 'membership';
      
      // Activate based on tier type
      if (tierType === 'organization') {
        console.log('ℹ️ Tier is organization type, activating organization');
        await this.activateOrganization(groupUserId);
        
        // Verify activation
        const isActive = await this.verifyOrganizationActive(groupUserId);
        if (!isActive) {
          console.warn('⚠️ Organization not active after initial activation, retrying');
          await this.activateOrganization(groupUserId);
        }
      } else {
        console.log('ℹ️ Tier is membership type, activating group user');
        await this.activateGroupUser(groupUserId);
        
        // Verify activation
        const isActive = await this.verifyGroupUserActive(groupUserId);
        if (!isActive) {
          console.warn('⚠️ Group user not active after initial activation, retrying');
          await this.activateGroupUser(groupUserId);
        }
      }
      
      console.log('✅ Activation based on tier type completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in activateBasedOnTierType:', error);
      throw error;
    }
  }
} 