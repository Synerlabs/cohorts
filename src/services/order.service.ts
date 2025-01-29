import { createClient } from "@/lib/utils/supabase/server";
import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { IOrder, IMembershipOrder, OrderStatus } from "@/lib/types/order";
import { ProductService } from "./product.service";
import { SuborderService } from "./suborder.service";
import { getCart } from "@/lib/utils/cart";

interface OrderPaymentTotals {
  totalPaid: number;
  totalPending: number;
}

export class OrderService {
  static async getMembershipOrder(id: string): Promise<IMembershipOrder | null> {
    const supabase = await createClient();
    
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        suborders(*)
      `)
      .eq('id', id)
      .eq('type', 'membership')
      .single();

    if (error) throw error;
    if (!order) return null;

    // Get the membership suborder
    const membershipSuborder = order.suborders?.[0];
    if (!membershipSuborder) return null;

    return {
      ...order,
      membership: {
        group_user_id: membershipSuborder.metadata?.group_user_id,
        start_date: membershipSuborder.metadata?.start_date,
        end_date: membershipSuborder.metadata?.end_date
      }
    } as IMembershipOrder;
  }

  static async getUserMembershipOrders(userId: string): Promise<IMembershipOrder[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        suborders(*)
      `)
      .eq('user_id', userId)
      .eq('type', 'membership')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map(order => ({
      ...order,
      membership: {
        group_user_id: order.suborders?.[0]?.metadata?.group_user_id,
        start_date: order.suborders?.[0]?.metadata?.start_date,
        end_date: order.suborders?.[0]?.metadata?.end_date
      }
    })) as IMembershipOrder[];
  }

  static async createSuborder(
    orderId: string,
    type: 'membership' | 'product' | 'event' | 'promotion',
    productId: string,
    amount: number,
    currency: string,
    applicationId?: string,
    metadata?: Record<string, any>
  ) {
    console.log('🔄 Creating suborder:', {
      orderId,
      type,
      productId,
      amount,
      currency,
      applicationId
    });
    
    const supabase = await createServiceRoleClient();
    
    const { data: suborder, error } = await supabase
      .from('suborders')
      .insert({
        order_id: orderId,
        type,
        product_id: productId,
        amount,
        currency,
        metadata: {
          ...metadata,
          application_id: applicationId
        },
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create suborder:', error);
      throw error;
    }

    console.log('✅ Suborder created:', suborder);
    return suborder;
  }

  static async createMembershipOrder(
    userId: string,
    productId: string,
    groupUserId: string,
    applicationId: string
  ): Promise<IOrder> {
    console.log('🔄 Creating membership order:', {
      userId,
      productId,
      groupUserId,
      applicationId
    });

    const supabase = await createServiceRoleClient();

    // Get product details
    const product = await ProductService.getMembershipTier(productId);
    if (!product) throw new Error('Product not found');

    console.log('📦 Product details:', product);

    let orderId: string | null = null;

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          type: 'membership',
          status: 'pending',
          amount: product.price,
          currency: product.currency,
        })
        .select()
        .single();

      if (orderError) throw orderError;
      console.log('✅ Order created:', order);
      
      orderId = order.id;

      // Create suborder with metadata
      const suborderMetadata = {
        group_user_id: groupUserId
      };

      const suborder = await this.createSuborder(
        order.id,
        'membership',
        productId,
        product.price,
        product.currency,
        applicationId,
        suborderMetadata
      );

      console.log('✅ Suborder created:', {
        id: suborder.id,
        type: suborder.type,
        metadata: suborder.metadata
      });

      return order;
      
    } catch (error) {
      console.error('❌ Error during order creation:', error);
      
      // Rollback if order was created but suborder failed
      if (orderId) {
        console.log('🔄 Rolling back - deleting order:', orderId);
        const { error: deleteError } = await supabase
          .from('orders')
          .delete()
          .eq('id', orderId);
          
        if (deleteError) {
          console.error('❌ Failed to rollback order:', deleteError);
          // Log but don't throw - we want to throw the original error
        } else {
          console.log('✅ Successfully rolled back order');
        }
      }
      
      throw error;
    }
  }

  static async updateOrderStatus(
    id: string,
    status: OrderStatus,
    completedAt?: string
  ): Promise<IOrder> {
    const supabase = await createClient();

    const update: any = { status };
    if (completedAt) update.completed_at = completedAt;

    const { data, error } = await supabase
      .from('orders')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateMembershipDates(
    orderId: string,
    startDate: string,
    endDate: string
  ): Promise<IMembershipOrder> {
    const supabase = await createServiceRoleClient();

    // Get current suborder to preserve metadata
    const { data: currentSuborder, error: fetchError } = await supabase
      .from('suborders')
      .select('metadata')
      .eq('order_id', orderId)
      .single();

    if (fetchError) throw fetchError;

    // Update the membership suborder metadata while preserving existing fields
    const { error } = await supabase
      .from('suborders')
      .update({
        metadata: {
          ...currentSuborder?.metadata,
          start_date: startDate,
          end_date: endDate
        }
      })
      .eq('order_id', orderId)
      .single();

    if (error) throw error;

    return await this.getMembershipOrder(orderId) as IMembershipOrder;
  }

  static async getOrderPayments(orderId: string) {
    console.log('🔍 Getting all payments for order:', orderId);
    
    const supabase = await createServiceRoleClient();
    
    console.log('🔍 Querying payments with order_id:', orderId);
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        currency,
        status,
        type,
        created_at,
        updated_at,
        stripe_payments (
          stripe_payment_intent_id,
          stripe_payment_method,
          stripe_status
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to get payments:', error);
      throw error;
    }

    if (!payments || payments.length === 0) {
      console.log('⚠️ No payments found for order:', orderId);
      
      // Double check with a simpler query
      const { data: basicPayments, error: basicError } = await supabase
        .from('payments')
        .select('id, amount, status')
        .eq('order_id', orderId);
        
      console.log('🔍 Basic query results:', {
        error: basicError,
        count: basicPayments?.length,
        payments: basicPayments
      });
    }

    console.log('💰 Found payments:', payments?.map(p => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      type: p.type,
      stripePaymentId: p.stripe_payments?.[0]?.stripe_payment_intent_id
    })));

    return payments || [];
  }

  static async getOrderPaymentTotals(orderId: string): Promise<OrderPaymentTotals> {
    console.log('🔍 Getting payment totals for order:', orderId);
    
    const payments = await this.getOrderPayments(orderId);
    
    return payments.reduce((totals, payment) => {
      if (payment.status === 'paid') {
        totals.totalPaid += payment.amount;
      } else if (payment.status === 'pending') {
        totals.totalPending += payment.amount;
      }
      return totals;
    }, { totalPaid: 0, totalPending: 0 });
  }

  static async getOrder(id: string): Promise<IOrder | null> {
    console.log('🔍 Getting order:', id);
    
    const supabase = await createServiceRoleClient();
    
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Failed to get order:', error);
      throw error;
    }

    return order;
  }

  static async updateOrderStatusFromPayments(orderId: string): Promise<IOrder> {
    console.log('🔄 Updating order status from payments:', orderId);

    // Get the order
    const order = await this.getOrder(orderId);
    if (!order) {
      console.error('❌ Order not found:', orderId);
      throw new Error('Order not found');
    }

    // Get payment totals
    const { totalPaid, totalPending } = await this.getOrderPaymentTotals(orderId);
    console.log('💰 Payment totals:', { totalPaid, totalPending, orderAmount: order.amount });

    // Get suborders
    const suborders = await SuborderService.getSubordersForOrder(orderId);
    console.log('📦 Suborders:', suborders.length);

    // Determine new status based on payments
    if (totalPaid >= order.amount) {
      console.log('✅ Payment completed, processing suborders');
      
      try {
        // Process all suborders
        const processedSuborders = await SuborderService.processOrderSuborders(orderId);
        console.log('✅ Suborders processed:', processedSuborders.length);

        // Check if all suborders completed successfully
        const allCompleted = processedSuborders.every(s => s.status === 'completed');
        
        if (allCompleted) {
          console.log('✅ All suborders completed, marking order as completed');
          return await this.updateOrderStatus(orderId, 'completed', new Date().toISOString());
        } else {
          console.log('⚠️ Some suborders not completed, marking order as processing');
          return await this.updateOrderStatus(orderId, 'processing');
        }
      } catch (error) {
        console.error('❌ Error processing suborders:', error);
        return await this.updateOrderStatus(orderId, 'failed');
      }
    } else if (totalPending > 0) {
      console.log('⏳ Payment pending');
      return await this.updateOrderStatus(orderId, 'processing');
    }
    
    // Default case: insufficient payment
    console.log('⚠️ Insufficient payment');
    return await this.updateOrderStatus(orderId, 'pending');
  }

  static async createOrderFromCart(userId: string): Promise<IOrder> {
    console.log('🔄 Creating order from cart for user:', userId);
    
    const supabase = await createServiceRoleClient();
    const cart = await getCart();
    if (!cart) throw new Error('Cart not found');

    console.log('📦 Cart contents:', JSON.stringify(cart, null, 2));

    let createdOrder: IOrder | null = null;

    try {
      // For each cart item, validate and get fresh data
      for (const item of cart.items) {
        if (item.type === 'membership') {
          console.log('🔍 Processing membership cart item:', {
            productId: item.productId,
            metadata: item.metadata
          });

          // Validate membership tier exists and get fresh data
          const product = await ProductService.getMembershipTier(item.productId);
          if (!product) {
            console.error('❌ Product not found:', item.productId);
            throw new Error('Invalid product in cart');
          }

          // Validate group user exists and belongs to user
          if (!item.metadata?.groupUserId) {
            console.error('❌ No group user ID in cart metadata');
            throw new Error('Invalid cart data');
          }

          const { data: groupUser, error: groupUserError } = await supabase
            .from('group_users')
            .select('id')
            .eq('id', item.metadata.groupUserId)
            .eq('user_id', userId)
            .single();

          if (groupUserError || !groupUser) {
            console.error('❌ Invalid group user:', groupUserError || 'Not found');
            throw new Error('Invalid group user');
          }

          // Validate application exists and belongs to group user
          if (!item.metadata?.applicationId) {
            console.error('❌ No application ID in cart metadata');
            throw new Error('Invalid cart data');
          }

          console.log('🔍 Validating application:', {
            applicationId: item.metadata.applicationId,
            groupUserId: item.metadata.groupUserId
          });

          const { data: application, error: appError } = await supabase
            .from('applications')
            .select('id, status')
            .eq('id', item.metadata.applicationId)
            .eq('group_user_id', item.metadata.groupUserId)
            .single();

          if (appError || !application) {
            console.error('❌ Invalid application:', appError || 'Not found');
            throw new Error('Invalid application');
          }

          console.log('✅ Application validated:', {
            id: application.id,
            status: application.status,
            metadata: item.metadata
          });

          if (application.status !== 'pending') {
            console.error('❌ Application not in pending status:', application.status);
            throw new Error('Application already processed');
          }

          // Create order with validated data
          console.log('✅ Creating membership order with validated data:', {
            userId,
            productId: product.id,
            groupUserId: groupUser.id,
            applicationId: application.id
          });

          createdOrder = await this.createMembershipOrder(
            userId,
            product.id,
            groupUser.id,
            application.id
          );

          return createdOrder;
        }
        // Handle other product types here...
      }

      throw new Error('No valid items in cart');
      
    } catch (error) {
      console.error('❌ Error during order creation from cart:', error);
      
      // If order was created but something else failed, try to rollback
      if (createdOrder?.id) {
        console.log('🔄 Rolling back - deleting order:', createdOrder.id);
        const { error: deleteError } = await supabase
          .from('orders')
          .delete()
          .eq('id', createdOrder.id);
          
        if (deleteError) {
          console.error('❌ Failed to rollback order:', deleteError);
        } else {
          console.log('✅ Successfully rolled back order');
        }
      }
      
      throw error;
    }
  }
} 