'use server';

import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';

// Add function to check for active Stripe accounts
async function hasActiveStripeAccount(orgId: string) {
  const supabase = await createServiceRoleClient();
  
  const { data: accounts, error } = await supabase
    .from('stripe_connected_accounts')
    .select('is_active')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .limit(1);

  if (error) {
    console.error('Failed to check for active Stripe accounts:', error);
    return false;
  }

  return accounts && accounts.length > 0;
}

export async function createStripePaymentIntent(orderId: string, amount: number, currency: string, orgId: string) {
  // Check for active Stripe account first
  const hasStripeAccount = await hasActiveStripeAccount(orgId);
  if (!hasStripeAccount) {
    throw new Error('No active Stripe account available for this organization');
  }

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
      group_id: orgId,
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
