import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { OrderService } from '../order.service';
import { MembershipActivationService } from '../membership-activation.service';

/**
 * PaymentProcessorService
 * 
 * A unified service for processing payments from different sources (manual, Stripe, etc.)
 * This ensures consistent behavior regardless of payment method.
 */
export class PaymentProcessorService {
  /**
   * Process a payment for an order
   * 
   * @param orderId The ID of the order being paid for
   * @returns A boolean indicating if the payment was successfully processed
   */
  static async processPayment(orderId: string): Promise<boolean> {
    console.log('🔄 Processing payment for order:', orderId);
    
    try {
      const supabase = await createServiceRoleClient();

      // Get the order with applications
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, applications(*)')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('❌ Failed to get order:', { orderId, error: orderError });
        throw new Error(`Failed to get order: ${orderError?.message || 'Order not found'}`);
      }

      // Check if there's an application associated with this order
      if (!order.applications || order.applications.length === 0) {
        console.log('ℹ️ No applications found for this order, proceeding with standard order processing');
        // Process the order normally using OrderService
        await OrderService.updateOrderStatusFromPayments(orderId);
        return true;
      }

      const application = order.applications[0];
      console.log('🔍 Found application for order:', { 
        applicationId: application.id, 
        status: application.status 
      });

      // Use the MembershipActivationService to process the application
      // This will handle the activation type correctly
      await MembershipActivationService.processFromSuborder(application.id, orderId);
      
      // Process the order
      await OrderService.updateOrderStatusFromPayments(orderId);
      return true;
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      throw error;
    }
  }
} 