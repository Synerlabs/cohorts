import { 
  Suborder, 
  SuborderFactory, 
  ISuborderData, 
  SuborderError, 
  SuborderStatus, 
  ISuborder, 
  IMembershipSuborder, 
  isMembershipSuborder 
} from '@/lib/types/suborder';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';

export class SuborderService {
  static async getSubordersForOrder(orderId: string): Promise<Suborder[]> {
    console.log('🔄 Getting suborders for order:', orderId);
    
    const supabase = await createServiceRoleClient();
    const { data: suborders, error } = await supabase
      .from('suborders')
      .select('*, product:products(*)')
      .eq('order_id', orderId);

    if (error) {
      console.error('❌ Failed to get suborders:', error);
      throw new SuborderError('Failed to get suborders', 'QUERY_ERROR', error);
    }

    if (!suborders) return [];
    return suborders.map(data => SuborderFactory.create(data as ISuborderData, supabase));
  }

  static async updateSuborderStatus(
    id: string,
    status: SuborderStatus,
    metadata?: Record<string, any>
  ): Promise<ISuborder> {
    console.log('🔄 Updating suborder status:', { id, status });
    
    const supabase = await createServiceRoleClient();
    
    const update: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (metadata) {
      update.metadata = metadata;
    }

    // Add timestamp based on status
    if (status === 'completed') update.completed_at = new Date().toISOString();
    if (status === 'failed') update.failed_at = new Date().toISOString();
    if (status === 'cancelled') update.cancelled_at = new Date().toISOString();

    const { data: suborder, error } = await supabase
      .from('suborders')
      .update(update)
      .eq('id', id)
      .select(`
        *,
        product:products(*)
      `)
      .single();

    if (error) {
      console.error('❌ Failed to update suborder status:', error);
      throw error;
    }

    return suborder;
  }

  static async processMembershipSuborder(suborder: IMembershipSuborder): Promise<IMembershipSuborder> {
    console.log('🔄 Starting processMembershipSuborder:', {
      suborderId: suborder.id,
      metadata: suborder.metadata,
      status: suborder.status
    });
    
    const supabase = await createServiceRoleClient();
    
    try {
      // Get the application and update its status
      if (!suborder.metadata?.application_id) {
        console.error('❌ No application_id in suborder metadata:', suborder.metadata);
        throw new Error('No application ID found in suborder metadata');
      }

      console.log('🔍 Getting application details:', suborder.metadata.application_id);
      
      const now = new Date().toISOString();

      // Get application details including tier information
      const { data: application, error: getAppError } = await supabase
        .from('applications')
        .select(`
          *,
          tier:tier_id(
            *,
            membership_tiers!inner(*)
          )
        `)
        .eq('id', suborder.metadata.application_id)
        .single();

      if (getAppError) {
        console.error('❌ Failed to get application:', { 
          error: getAppError,
          applicationId: suborder.metadata.application_id 
        });
        throw new Error(`Failed to get application details: ${getAppError.message}`);
      }

      if (!application) {
        console.error('❌ Application not found:', suborder.metadata.application_id);
        throw new Error('Application not found');
      }

      console.log('✅ Found application:', {
        applicationId: application.id,
        userId: application.user_id,
        groupId: application.group_id,
        tierId: application.tier_id,
        status: application.status
      });

      // Calculate membership dates
      const startDate = new Date();
      const durationMonths = application.tier?.membership_tiers?.[0]?.duration_months || 12;
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + durationMonths);

      console.log('📅 Calculated membership dates:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        durationMonths
      });

      // Create membership record
      console.log('🔄 Creating membership record...', {
        applicationId: application.id,
        userId: application.user_id,
        groupId: application.group_id,
        tierId: application.tier_id
      });

      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          user_id: application.user_id,
          group_id: application.group_id,
          tier_id: application.tier_id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          application_id: application.id,
          status: 'active'
        });

      if (membershipError) {
        console.error('❌ Failed to create membership:', {
          error: membershipError,
          applicationId: application.id
        });
        throw new Error(`Failed to create membership: ${membershipError.message}`);
      }

      console.log('✅ Created membership record');

      // Update application status
      console.log('🔄 Updating application status to approved...');
      
      const { data: updatedApp, error: appError } = await supabase
        .from('applications')
        .update({
          status: 'approved',
          approved_at: now,
          updated_at: now
        })
        .eq('id', suborder.metadata.application_id)
        .select('group_user_id, status')
        .single();

      if (appError) {
        console.error('❌ Failed to update application:', {
          error: appError,
          applicationId: application.id
        });
        throw new Error(`Failed to update application: ${appError.message}`);
      }

      if (!updatedApp) {
        console.error('❌ Updated application not found:', application.id);
        throw new Error('Application not found after update');
      }

      if (updatedApp.status !== 'approved') {
        console.error('❌ Application status not updated:', {
          applicationId: application.id,
          status: updatedApp.status
        });
        throw new Error('Failed to update application status');
      }

      console.log('✅ Updated application status:', {
        applicationId: application.id,
        status: updatedApp.status
      });

      // Store group_user_id in metadata if not already there
      let updatedSuborder = suborder;
      if (updatedApp.group_user_id && !suborder.metadata.group_user_id) {
        console.log('🔄 Updating suborder metadata with group_user_id:', updatedApp.group_user_id);
        
        updatedSuborder = await this.updateSuborderStatus(suborder.id, 'processing', {
          ...suborder.metadata,
          group_user_id: updatedApp.group_user_id
        }) as IMembershipSuborder;
      }

      // Activate the group user
      if (updatedApp.group_user_id) {
        console.log('🔄 Activating group user:', updatedApp.group_user_id);
        
        const { error: userError } = await supabase
          .from('group_users')
          .update({
            is_active: true,
            updated_at: now
          })
          .eq('id', updatedApp.group_user_id);

        if (userError) {
          console.error('❌ Failed to activate group user:', {
            error: userError,
            groupUserId: updatedApp.group_user_id
          });
          throw new Error(`Failed to activate group user: ${userError.message}`);
        }

        // Verify group user was activated
        const { data: verifyUser, error: verifyError } = await supabase
          .from('group_users')
          .select('is_active')
          .eq('id', updatedApp.group_user_id)
          .single();

        if (verifyError || !verifyUser || !verifyUser.is_active) {
          console.error('❌ Failed to verify group user activation:', {
            error: verifyError,
            groupUserId: updatedApp.group_user_id,
            isActive: verifyUser?.is_active
          });
          throw new Error('Failed to verify group user activation');
        }

        console.log('✅ Activated group user:', updatedApp.group_user_id);
      }

      // All steps completed successfully, now mark suborder as completed
      console.log('🔄 Marking suborder as completed:', updatedSuborder.id);
      
      return await this.updateSuborderStatus(updatedSuborder.id, 'completed', {
        ...updatedSuborder.metadata,
        completedAt: now
      }) as IMembershipSuborder;

    } catch (error) {
      console.error('❌ Failed to process membership suborder:', error);
      // Mark as failed with error details
      await this.updateSuborderStatus(suborder.id, 'failed', {
        ...suborder.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date().toISOString()
      });
      throw error;
    }
  }

  static async processSuborder(suborder: ISuborder): Promise<ISuborder> {
    console.log('🔄 Processing suborder:', { 
      id: suborder.id, 
      type: suborder.type,
      productType: suborder.product?.type,
      metadata: suborder.metadata
    });
    
    // Check if suborder is already completed or failed
    if (suborder.status === 'completed') {
      console.log('⏭️ Suborder already completed:', suborder.id);
      return suborder;
    }
    
    if (suborder.status === 'failed') {
      console.log('⚠️ Suborder previously failed:', suborder.id);
      throw new Error('Cannot process failed suborder');
    }

    try {
      // Update to processing status first
      await this.updateSuborderStatus(suborder.id, 'processing');

      // Process based on type
      if (suborder.type === 'membership') {
        console.log('🔄 Processing as membership suborder:', {
          id: suborder.id,
          applicationId: suborder.metadata?.application_id
        });
        return await this.processMembershipSuborder(suborder as IMembershipSuborder);
      }

      // For now, other types just get marked as completed
      // Add specific processing for other product types as needed
      console.log('ℹ️ No specific processing for type:', suborder.type);
      return await this.updateSuborderStatus(suborder.id, 'completed');
    } catch (error) {
      console.error('❌ Failed to process suborder:', error);
      // Mark as failed with error details
      await this.updateSuborderStatus(suborder.id, 'failed', {
        ...suborder.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date().toISOString()
      });
      throw error;
    }
  }

  static async processOrderSuborders(orderId: string): Promise<Suborder[]> {
    console.log('🔄 Processing suborders for order:', orderId);
    
    const suborders = await this.getSubordersForOrder(orderId);
    if (suborders.length === 0) {
      console.warn('⚠️ No suborders found for order:', orderId);
      return [];
    }

    const results: Suborder[] = [];
    const errors: Error[] = [];

    for (const suborder of suborders) {
      try {
        if (suborder.isFinalized()) {
          console.log(`⏭️ Skipping finalized suborder ${suborder.toString()}`);
          results.push(suborder);
          continue;
        }

        console.log(`🔄 Processing suborder ${suborder.toString()}`);
        const processed = await suborder.process();
        results.push(processed);
      } catch (error) {
        console.error('❌ Failed to process suborder:', {
          orderId,
          suborder: suborder.toString(),
          error
        });
        errors.push(error as Error);
        results.push(suborder);
      }
    }

    const allCompleted = results.every(s => s.isCompleted());
    const summary = {
      total: results.length,
      completed: results.filter(s => s.isCompleted()).length,
      failed: results.filter(s => s.isFailed()).length,
      processing: results.filter(s => s.isProcessing()).length,
      pending: results.filter(s => s.isPending()).length,
      cancelled: results.filter(s => s.isCancelled()).length
    };

    if (!allCompleted) {
      console.log('⚠️ Not all suborders completed:', summary);
      if (errors.length > 0) {
        console.error('❌ Errors encountered:', errors);
      }
    } else {
      console.log('✅ All suborders completed successfully:', summary);
    }

    return results;
  }
}
