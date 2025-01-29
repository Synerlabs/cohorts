import { Suborder, SuborderFactory, ISuborderData, SuborderError } from '@/lib/types/suborder';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { ISuborder, IMembershipSuborder, SuborderStatus, isMembershipSuborder } from "@/lib/types/suborder";

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
    console.log('🔄 Processing membership suborder:', suborder.id);
    
    const supabase = await createServiceRoleClient();
    
    try {
      // Get the application and update its status
      if (!suborder.metadata?.application_id) {
        throw new Error('No application ID found in suborder metadata');
      }

      console.log('✅ Approving application:', suborder.metadata.application_id);
      
      const now = new Date().toISOString();

      // Update application status
      const { data: application, error: appError } = await supabase
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
        throw new Error(`Failed to update application: ${appError.message}`);
      }

      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'approved') {
        throw new Error('Failed to update application status');
      }

      // Store group_user_id in metadata if not already there
      let updatedSuborder = suborder;
      if (application.group_user_id && !suborder.metadata.group_user_id) {
        updatedSuborder = await this.updateSuborderStatus(suborder.id, 'processing', {
          ...suborder.metadata,
          group_user_id: application.group_user_id
        }) as IMembershipSuborder;
      }

      // Activate the group user
      if (application.group_user_id) {
        const { error: userError } = await supabase
          .from('group_users')
          .update({
            is_active: true,
            updated_at: now
          })
          .eq('id', application.group_user_id);

        if (userError) {
          throw new Error(`Failed to activate group user: ${userError.message}`);
        }

        // Verify group user was activated
        const { data: verifyUser, error: verifyError } = await supabase
          .from('group_users')
          .select('is_active')
          .eq('id', application.group_user_id)
          .single();

        if (verifyError || !verifyUser || !verifyUser.is_active) {
          throw new Error('Failed to verify group user activation');
        }
      }

      // Verify application is still in approved state
      const { data: verifyApp, error: verifyAppError } = await supabase
        .from('applications')
        .select('status')
        .eq('id', suborder.metadata.application_id)
        .single();

      if (verifyAppError || !verifyApp || verifyApp.status !== 'approved') {
        throw new Error('Failed to verify application status');
      }

      // All steps completed successfully, now mark suborder as completed
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
    console.log('🔄 Processing suborder:', { id: suborder.id, productType: suborder.product?.type });
    
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
      if (suborder.product && isMembershipSuborder(suborder, suborder.product)) {
        return await this.processMembershipSuborder(suborder as IMembershipSuborder);
      }

      // For now, other types just get marked as completed
      // Add specific processing for other product types as needed
      console.log('ℹ️ No specific processing for type:', suborder.product?.type);
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
