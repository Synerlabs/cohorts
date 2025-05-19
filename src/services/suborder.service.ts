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
import { MembershipActivationService } from './membership-activation.service';
import { Database } from '@/lib/types/database.types';
import { suborderProcessorRegistry } from "./suborder-processors/registry";

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
    return suborders.map(data => SuborderFactory.create(data as ISuborderData, supabase as any));
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
    
    try {
      // Get the application and update its status
      if (!suborder.metadata?.application_id) {
        console.error('❌ No application_id in suborder metadata:', suborder.metadata);
        throw new Error('No application ID found in suborder metadata');
      }

      console.log('🔍 Processing membership from suborder:', suborder.metadata.application_id);
      
      // Use the MembershipActivationService to process the membership
      await MembershipActivationService.processFromSuborder(
        suborder.metadata.application_id,
        suborder.order_id
      );

      // All steps completed successfully, now mark suborder as completed
      console.log('🔄 Marking suborder as completed:', suborder.id);
      
      return await this.updateSuborderStatus(suborder.id, 'completed', {
        ...suborder.metadata,
        completedAt: new Date().toISOString()
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
        const handler = suborderProcessorRegistry[suborder.type];
        if (handler) {
          await handler(suborder);
        } else {
          console.warn(`⚠️ No processor registered for suborder type: ${suborder.type}`);
        }
        results.push(suborder);
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

  static async processSuborderById(suborderId: string): Promise<ISuborder> {
    const supabase = await createServiceRoleClient();
    const { data, error } = await supabase
      .from('suborders')
      .select('*, product:products(*)')
      .eq('id', suborderId)
      .single();
    if (error || !data) {
      throw new Error('Suborder not found');
    }
    const suborder = SuborderFactory.create(data as ISuborderData, supabase as any);
    return this.processSuborder(suborder);
  }
}
