'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    const supabase = await createServiceRoleClient();
    
    // Get order details with payment information
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        amount,
        currency,
        payments (
          id,
          status,
          amount,
          currency
        )
      `)
      .eq('id', orderId)
      .single();
    
    if (error) {
      console.error('Error fetching order:', error);
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check if the order is already paid
    const isPaid = order.status === 'paid' || 
                   order.status === 'completed' || 
                   (order.payments && order.payments.some(p => p.status === 'paid'));
    
    // Return order status and payment information
    return NextResponse.json({
      id: order.id,
      status: order.status,
      isPaid,
      amount: order.amount,
      currency: order.currency,
      payments: order.payments
    });
  } catch (error) {
    console.error('Error checking order status:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 