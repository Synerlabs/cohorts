import { createClient } from "@/lib/utils/supabase/server";
import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { IOrder, IMembershipOrder, OrderStatus } from "@/lib/types/order";
import { ProductService } from "./product.service";

interface OrderPaymentTotals {
  totalPaid: number;
  totalPending: number;
}

export class OrderService {
  static async getMembershipOrder(id: string): Promise<IMembershipOrder | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        membership:memberships(*)
      `)
      .eq('id', id)
      .eq('type', 'membership')
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      membership: data.membership[0]
    } as IMembershipOrder;
  }

  static async getUserMembershipOrders(userId: string): Promise<IMembershipOrder[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        membership:memberships(*)
      `)
      .eq('user_id', userId)
      .eq('type', 'membership')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map(order => ({
      ...order,
      membership: order.membership[0]
    })) as IMembershipOrder[];
  }

  static async createMembershipOrder(
    userId: string,
    productId: string,
    groupUserId: string
  ): Promise<IMembershipOrder> {
    const supabase = await createClient();

    // Get product details
    const product = await ProductService.getMembershipTier(productId);
    if (!product) throw new Error('Product not found');

    // First create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        type: 'membership',
        user_id: userId,
        product_id: productId,
        status: 'pending',
        amount: product.price,
        currency: product.currency
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Then create the membership
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        order_id: order.id,
        group_user_id: groupUserId
      })
      .select()
      .single();

    if (membershipError) throw membershipError;

    return {
      ...order,
      membership
    } as IMembershipOrder;
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
    const supabase = await createClient();

    const { error } = await supabase
      .from('memberships')
      .update({
        start_date: startDate,
        end_date: endDate
      })
      .eq('order_id', orderId);

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
        stripe_payments(*)
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

    const totals = payments.reduce((acc, payment) => ({
      totalPaid: acc.totalPaid + (payment.status === 'paid' ? payment.amount : 0),
      totalPending: acc.totalPending + (payment.status === 'pending' ? payment.amount : 0)
    }), { totalPaid: 0, totalPending: 0 });

    console.log('💰 Payment totals calculated:', {
      ...totals,
      paymentCount: payments.length,
      statuses: payments.map(p => p.status)
    });
    
    return totals;
  }

  static async updateOrderStatusFromPayments(orderId: string): Promise<IOrder> {
    console.log('🔄 Updating order status from payments:', orderId);
    
    const supabase = await createClient();
    
    // Get order and its payment totals
    const [{ data: order, error: orderError }, totals] = await Promise.all([
      supabase.from('orders').select('*').eq('id', orderId).single(),
      this.getOrderPaymentTotals(orderId)
    ]);

    if (orderError || !order) {
      console.error('❌ Order not found:', orderError);
      throw new Error('Order not found');
    }

    console.log('💰 Payment totals:', {
      orderAmount: order.amount,
      totalPaid: totals.totalPaid,
      totalPending: totals.totalPending
    });

    // Determine new status
    let newStatus: OrderStatus = order.status;
    if (totals.totalPaid >= order.amount) {
      console.log('✅ Total paid meets or exceeds order amount - marking as paid');
      newStatus = 'paid';
    } else if (totals.totalPending > 0) {
      console.log('⏳ Has pending payments - marking as pending');
      newStatus = 'pending';
    }

    console.log('📊 Status update:', {
      currentStatus: order.status,
      newStatus: newStatus
    });

    // Only update if status changed
    if (newStatus !== order.status) {
      console.log('🔄 Updating order status to:', newStatus);
      
      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'paid' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update order status:', error);
        throw error;
      }

      console.log('✅ Order status updated successfully');
      return updatedOrder;
    }

    console.log('ℹ️ No status update needed');
    return order;
  }
} 