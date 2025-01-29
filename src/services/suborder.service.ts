import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { ISuborder, IMembershipSuborder, SuborderStatus, isMembershipSuborder } from "@/lib/types/suborder";

export class SuborderService {
  static async getSubordersForOrder(orderId: string): Promise<ISuborder[]> {
    console.log('🔍 Getting suborders for order:', orderId);
    
    const supabase = await createServiceRoleClient();
    
    const { data: suborders, error } = await supabase
      .from('suborders')
      .select(`
        *,
        product:products(*)
      `)
      .eq('order_id', orderId);

    if (error) {
      console.error('❌ Failed to get suborders:', error);
      throw error;
    }

    return suborders || [];
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
      // Update status to processing
      await this.updateSuborderStatus(suborder.id, 'processing');

      // Get the application and update its status
      if (suborder.metadata?.application_id) {
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
          .select('group_user_id')
          .single();

        if (appError) throw appError;

        // Store group_user_id in metadata if not already there
        if (application?.group_user_id && !suborder.metadata?.group_user_id) {
          await this.updateSuborderStatus(suborder.id, 'processing', {
            ...suborder.metadata,
            group_user_id: application.group_user_id
          });
        }

        // Activate the group user
        if (application?.group_user_id) {
          const { error: userError } = await supabase
            .from('group_users')
            .update({
              is_active: true,
              updated_at: now
            })
            .eq('id', application.group_user_id);

          if (userError) throw userError;
        }
      }

      // Mark suborder as completed
      return await this.updateSuborderStatus(suborder.id, 'completed') as IMembershipSuborder;

    } catch (error: any) {
      console.error('❌ Failed to process membership suborder:', error);
      // Mark as failed with error details
      await this.updateSuborderStatus(suborder.id, 'failed', {
        ...suborder.metadata,
        error: error.message || 'Unknown error'
      });
      throw error;
    }
  }

  static async processSuborder(suborder: ISuborder): Promise<ISuborder> {
    console.log('🔄 Processing suborder:', { id: suborder.id, productType: suborder.product?.type });
    
    if (isMembershipSuborder(suborder, suborder.product)) {
      return await this.processMembershipSuborder(suborder as IMembershipSuborder);
    }

    // For now, just mark other types as completed
    // Add specific processing for other product types as needed
    return await this.updateSuborderStatus(suborder.id, 'completed');
  }

  static async processOrderSuborders(orderId: string): Promise<ISuborder[]> {
    console.log('🔄 Processing suborders for order:', orderId);
    
    const suborders = await this.getSubordersForOrder(orderId);
    const results = [];

    for (const suborder of suborders) {
      try {
        const processed = await this.processSuborder(suborder);
        results.push(processed);
      } catch (error) {
        console.error('❌ Failed to process suborder:', {
          orderId,
          suborderId: suborder.id,
          error
        });
        // Continue processing other suborders even if one fails
      }
    }

    return results;
  }
}
