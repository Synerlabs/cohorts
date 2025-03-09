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
          type,
          status,
          amount,
          currency,
          created_at,
          updated_at,
          manual_payments (
            payment_id,
            notes
          ),
          stripe_payments (
            payment_id,
            stripe_payment_intent_id,
            stripe_status
          )
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
    
    // Process payments to add reference if available from manual payments
    const processedPayments = order.payments?.map(payment => {
      if (payment.type === 'manual' && payment.manual_payments && payment.manual_payments.length > 0) {
        const notes = payment.manual_payments[0].notes;
        // Extract reference from notes if it exists
        let reference = '';
        if (notes && notes.includes('Reference:')) {
          reference = notes.split('Reference:')[1].trim();
        }
        return { ...payment, reference };
      }
      return payment;
    });
    
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
      payments: processedPayments || []
    });
  } catch (error) {
    console.error('Error checking order status:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 