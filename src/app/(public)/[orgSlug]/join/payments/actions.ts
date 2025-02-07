'use server';

import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';

// Add function to get Stripe connected account
async function getStripeConnectedAccount(groupId: string) {
  const supabase = await createServiceRoleClient();
  
  const { data: account, error } = await supabase
    .from('stripe_connected_accounts')
    .select('account_id, is_active')
    .eq('org_id', groupId)
    .eq('is_active', true)
    .single();

  if (error || !account) {
    console.error('Failed to get Stripe connected account:', error);
    throw new Error('No active Stripe account available for this organization');
  }

  return account;
}

export async function createStripePaymentIntent(orderId: string, amount: number, currency: string, groupId: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = await createServiceRoleClient();
  
  // Get the connected account
  const connectedAccount = await getStripeConnectedAccount(groupId);

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

  // Calculate platform fee (e.g., 5%)
  const platformFeePercent = 5;
  const platformFee = Math.round((amount * platformFeePercent) / 100);

  // Create the payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    application_fee_amount: platformFee,
    on_behalf_of: connectedAccount.account_id,
    transfer_data: {
      destination: connectedAccount.account_id,
    },
    metadata: {
      orderId,
      groupId
    }
  });

  // Create a payment record in pending state
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      order_id: orderId,
      user_id: order.user_id,
      group_id: groupId,
      type: 'stripe',
      status: 'pending',
      amount,
      currency,
      // platform_fee: platformFee,
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
      // stripe_account_id: connectedAccount.account_id,
      stripe_status: paymentIntent.status,
      // application_fee_amount: platformFee
    });

  if (stripePaymentError) {
    console.error('Failed to create stripe payment record:', stripePaymentError);
    throw new Error('Failed to create stripe payment record');
  }

  return paymentIntent.client_secret;
} 
