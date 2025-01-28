'use server';

import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';

export async function createStripePaymentIntent(orderId: string, amount: number, currency: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = await createServiceRoleClient();
  
  // Get the order to get the user_id
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('user_id')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.error('Failed to fetch order:', orderError);
    throw new Error('Failed to fetch order');
  }

  // Create the payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    metadata: {
      orderId
    }
  });

  // Create a payment record in pending state
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      order_id: orderId,
      user_id: order.user_id,
      type: 'stripe',
      status: 'pending',
      amount,
      currency,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (paymentError || !payment) {
    console.error('Failed to create payment record:', paymentError);
    throw new Error('Failed to create payment record');
  }

  // Create stripe payment record
  const { error: stripePaymentError } = await supabase
    .from('stripe_payments')
    .insert({
      payment_id: payment.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_status: paymentIntent.status
    });

  if (stripePaymentError) {
    console.error('Failed to create stripe payment record:', stripePaymentError);
    throw new Error('Failed to create stripe payment record');
  }

  return paymentIntent.client_secret;
} 
