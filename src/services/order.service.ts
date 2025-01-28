import { createClient } from "@/lib/utils/supabase/server";
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

  static async getOrderPaymentTotals(orderId: string): Promise<OrderPaymentTotals> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('payments')
      .select('amount, status')
      .eq('order_id', orderId);

    if (error) throw error;

    const totals = (data || []).reduce((acc, payment) => ({
      totalPaid: acc.totalPaid + (payment.status === 'paid' ? payment.amount : 0),
      totalPending: acc.totalPending + (payment.status === 'pending' ? payment.amount : 0)
    }), { totalPaid: 0, totalPending: 0 });

    return totals;
  }

  static async updateOrderStatusFromPayments(orderId: string): Promise<IOrder> {
    const supabase = await createClient();
    
    // Get order and its payment totals
    const [{ data: order }, totals] = await Promise.all([
      supabase.from('orders').select('*').eq('id', orderId).single(),
      this.getOrderPaymentTotals(orderId)
    ]);

    if (!order) throw new Error('Order not found');

    // Determine new status
    let newStatus: OrderStatus = order.status;
    if (totals.totalPaid >= order.amount) {
      newStatus = 'paid';
    } else if (totals.totalPending > 0) {
      newStatus = 'pending';
    }

    // Only update if status changed
    if (newStatus !== order.status) {
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

      if (error) throw error;
      return updatedOrder;
    }

    return order;
  }
} 