import { createClient } from "@/lib/utils/supabase/server";
import { IApplication, IMembershipApplication, ApplicationStatus } from "@/lib/types/application";
import { OrderService } from "./order.service";
import { ProductService } from "./product.service";

export class ApplicationService {
  static async getMembershipApplication(id: string): Promise<IMembershipApplication | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('membership_applications_view')
      .select('*')
      .eq('application_id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async getGroupMembershipApplications(groupId: string): Promise<IMembershipApplication[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('membership_applications_view')
      .select('*')
      .eq('group_id', groupId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getUserMembershipApplications(userId: string): Promise<IMembershipApplication[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('membership_applications_view')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createMembershipApplication(
    groupUserId: string,
    productId: string
  ): Promise<IMembershipApplication> {
    const supabase = await createClient();

    // Get product details to determine initial status
    const product = await ProductService.getMembershipTier(productId);
    if (!product) throw new Error('Product not found');

    let initialStatus: ApplicationStatus;
    switch (product.membership_tier.activation_type) {
      case 'automatic':
        initialStatus = 'approved';
        break;
      case 'review_required':
        initialStatus = 'pending_review';
        break;
      case 'payment_required':
        initialStatus = 'pending_payment';
        break;
      case 'review_then_payment':
        initialStatus = 'pending_review';
        break;
      default:
        initialStatus = 'pending';
    }

    // Create the application
    const { data, error } = await supabase
      .from('applications')
      .insert({
        type: 'membership',
        status: initialStatus,
        group_user_id: groupUserId,
        tier_id: productId
      })
      .select()
      .single();

    if (error) throw error;

    // If payment is required, create an order
    if (product.price > 0 && product.membership_tier.activation_type === 'payment_required') {
      const order = await OrderService.createMembershipOrder(
        data.user_id,
        productId,
        groupUserId
      );

      // Link the order to the application
      await supabase
        .from('applications')
        .update({ order_id: order.id })
        .eq('id', data.id);
    }

    return await this.getMembershipApplication(data.id) as IMembershipApplication;
  }

  static async updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    metadata?: {
      approved_at?: string;
      rejected_at?: string;
    }
  ): Promise<IApplication> {
    const supabase = await createClient();

    const update: any = { status, ...metadata };

    const { data, error } = await supabase
      .from('applications')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
} 