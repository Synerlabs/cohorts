import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = await createServiceRoleClient();
    const orderId = params.orderId;

    // Get order with its payments
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        status,
        payments (
          id,
          status,
          amount,
          type
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('Error fetching order status:', error);
      return NextResponse.json({ error: 'Failed to fetch order status' }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Calculate total paid amount from approved/paid payments
    const totalPaid = order.payments
      ?.filter(p => p.status === 'approved' || p.status === 'paid')
      ?.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0;

    // Check for any pending Stripe payments
    const hasPendingStripePayment = order.payments?.some(
      p => p.type === 'stripe' && p.status === 'pending'
    );

    return NextResponse.json({
      status: order.status,
      totalPaid,
      hasPendingPayment: hasPendingStripePayment
    });
  } catch (error) {
    console.error('Error in payment status check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 