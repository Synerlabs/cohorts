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
  
  // Check if order is already paid or completed
  const { data: orderDetails, error: orderDetailsError } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      status,
      applications!applications_order_id_fkey (
        id,
        status
      ),
      payments (
        id,
        status,
        amount
      )
    `)
    .eq('id', orderId)
    .single();

  if (orderDetailsError || !orderDetails) {
    console.error('Failed to fetch order:', orderDetailsError);
    throw new Error('Failed to fetch order');
  }

  // Check if order is already completed or paid
  if (orderDetails.status === 'completed' || orderDetails.status === 'paid') {
    throw new Error('This order has already been paid');
  }

  // Check if application is already settled
  const application = orderDetails.applications as unknown as { id: string; status: string } | null;
  if (application?.status === 'approved' || application?.status === 'completed') {
    throw new Error('This application has already been processed');
  }

  // Calculate total paid amount
  const totalPaid = orderDetails.payments
    ?.filter(p => p.status === 'approved' || p.status === 'paid')
    ?.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0;

  // Check if already fully paid
  if (totalPaid >= amount) {
    throw new Error('This order has already been fully paid');
  }
  
  // First, check for existing pending payment intent for this order
  const { data: existingPayment, error: existingPaymentError } = await supabase
    .from('payments')
    .select(`
      *,
      stripe_payments (
        stripe_payment_intent_id,
        stripe_status
      )
    `)
    .eq('order_id', orderId)
    .eq('type', 'stripe')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existingPayment?.stripe_payments?.stripe_payment_intent_id) {
    try {
      // Retrieve the payment intent to check its status
      const existingIntent = await stripe.paymentIntents.retrieve(
        existingPayment.stripe_payments.stripe_payment_intent_id
      );

      // If the intent is still usable (not expired, failed, or cancelled), return it
      if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingIntent.status)) {
        return existingIntent.client_secret;
      }

      // If intent is not usable, cancel it if it's still cancellable
      if (!['succeeded', 'canceled'].includes(existingIntent.status)) {
        await stripe.paymentIntents.cancel(existingIntent.id);
      }

      // Mark the existing payment record as cancelled
      await supabase
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('id', existingPayment.id);
    } catch (error) {
      console.error('Error handling existing payment intent:', error);
      // Continue with creating new payment intent if there was an error
    }
  }

  // Get the connected account
  const connectedAccount = await getStripeConnectedAccount(groupId);

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
      user_id: orderDetails.user_id,
      group_id: groupId,
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
      stripe_status: paymentIntent.status,
    });

  if (stripePaymentError) {
    console.error('Failed to create stripe payment record:', stripePaymentError);
    throw new Error('Failed to create stripe payment record');
  }

  return paymentIntent.client_secret;
} 
