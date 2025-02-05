'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { OrderService } from '@/services/order.service';
import { StripePaymentProvider } from '@/services/payment/providers/stripe-payment.provider';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    console.log('🔔 Received Stripe webhook request');

    if (!signature) {
      console.error('❌ No stripe signature found in webhook request');
      return new NextResponse('No stripe signature', { status: 400 });
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log('✅ Webhook signature verified');
    console.log('🔔 Processing webhook event:', event.type, 'Event ID:', event.id);

    const supabase = await createServiceRoleClient();

    // Handle the event
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log('🔄 Stripe Connect account updated:', account.id);

        // Find the organization with this Stripe account
        const { data: settings, error: settingsError } = await supabase
          .from('stripe_connected_accounts')
          .select('org_id')
          .eq('account_id', account.id)
          .single();

        if (settingsError || !settings) {
          console.error('❌ Failed to find organization with Stripe account:', account.id);
          return new NextResponse('Organization not found', { status: 404 });
        }

        // Update the account status
        const { error: updateError } = await supabase
          .from('stripe_connected_accounts')
          .update({
            account_status: account.charges_enabled ? 'active' : 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('org_id', settings.org_id);

        if (updateError) {
          console.error('❌ Failed to update Stripe settings:', updateError);
          return new NextResponse('Failed to update settings', { status: 500 });
        }

        console.log('✅ Updated Stripe Connect account status');
        break;
      }

      case 'account.application.deauthorized': {
        const application = event.data.object as Stripe.Application;
        const accountId = event.account as string;
        console.log('🔌 Stripe Connect account disconnected:', accountId);

        // Find and update the organization's Stripe settings
        const { data: settings, error: settingsError } = await supabase
          .from('stripe_connected_accounts')
          .select('org_id')
          .eq('account_id', accountId)
          .single();

        if (settingsError || !settings) {
          console.error('❌ Failed to find organization with Stripe account:', accountId);
          return new NextResponse('Organization not found', { status: 404 });
        }

        // Update the account status to disconnected
        const { error: updateError } = await supabase
          .from('stripe_connected_accounts')
          .update({
            account_status: 'disconnected',
            updated_at: new Date().toISOString()
          })
          .eq('org_id', settings.org_id);

        if (updateError) {
          console.error('❌ Failed to update Stripe settings:', updateError);
          return new NextResponse('Failed to update settings', { status: 500 });
        }

        console.log('✅ Updated Stripe Connect account status to disconnected');
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('💰 Payment succeeded:', {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          orderId: paymentIntent.metadata.orderId
        });

        // Get the order ID from metadata
        const orderId = paymentIntent.metadata.orderId;
        if (!orderId) {
          console.error('❌ No orderId found in payment intent metadata');
          return new NextResponse('No orderId in metadata', { status: 400 });
        }

        // Get the order to verify it exists and check amount
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderError || !order) {
          console.error('❌ Failed to find order:', { orderId, error: orderError });
          return new NextResponse('Order not found', { status: 404 });
        }

        console.log('✅ Found order:', { 
          orderId: order.id, 
          amount: order.amount,
          status: order.status 
        });

        // Update the payment status
        const { data: stripePayment, error: stripePaymentError } = await supabase
          .from('stripe_payments')
          .select('payment_id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (stripePaymentError || !stripePayment) {
          console.error('❌ Failed to find stripe payment:', { paymentIntentId: paymentIntent.id, error: stripePaymentError });
          return new NextResponse('Stripe payment not found', { status: 404 });
        }

        // Get the payment record
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select('id')
          .eq('id', stripePayment.payment_id)
          .single();

        if (paymentError || !payment) {
          console.error('❌ Failed to find payment:', { paymentId: stripePayment.payment_id, error: paymentError });
          return new NextResponse('Payment not found', { status: 404 });
        }

        console.log('✅ Found payment record:', payment.id);

        // Update stripe payment status
        const { error: stripeError } = await supabase
          .from('stripe_payments')
          .update({ stripe_status: paymentIntent.status })
          .eq('payment_id', payment.id);

        if (stripeError) {
          console.error('❌ Failed to update stripe payment:', stripeError);
          return new NextResponse('Failed to update payment', { status: 500 });
        }

        console.log('✅ Updated stripe payment status');

        // Update payment status to paid (not succeeded)
        const { error: updateError } = await supabase
          .from('payments')
          .update({ 
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);

        if (updateError) {
          console.error('❌ Failed to update payment status:', updateError);
          return new NextResponse('Failed to update payment', { status: 500 });
        }

        console.log('✅ Updated payment status to paid');

        // Process the order and its suborders
        try {
          // This will:
          // 1. Check if payment total is sufficient
          // 2. Process all suborders if payment is sufficient
          // 3. Update order status based on suborder processing results
          await OrderService.updateOrderStatusFromPayments(orderId);
          console.log('✅ Order processed successfully');
        } catch (error) {
          console.error('❌ Failed to process order:', error);
          return new NextResponse('Failed to process order', { status: 500 });
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('❌ Payment failed:', paymentIntent.id);

        // Get the order ID from metadata
        const orderId = paymentIntent.metadata.orderId;
        if (!orderId) {
          console.error('❌ No orderId found in payment intent metadata');
          return new NextResponse('No orderId in metadata', { status: 400 });
        }

        // Update the payment status
        const { data: stripePayment, error: stripePaymentError } = await supabase
          .from('stripe_payments')
          .select('payment_id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (stripePaymentError || !stripePayment) {
          console.error('❌ Failed to find stripe payment:', { paymentIntentId: paymentIntent.id, error: stripePaymentError });
          return new NextResponse('Stripe payment not found', { status: 404 });
        }

        // Get the payment record
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select('id')
          .eq('id', stripePayment.payment_id)
          .single();

        if (paymentError || !payment) {
          console.error('❌ Failed to find payment:', { paymentId: stripePayment.payment_id, error: paymentError });
          return new NextResponse('Payment not found', { status: 404 });
        }

        // Update stripe payment status
        const { error: stripeError } = await supabase
          .from('stripe_payments')
          .update({ stripe_status: paymentIntent.status })
          .eq('payment_id', payment.id);

        if (stripeError) {
          console.error('❌ Failed to update stripe payment:', stripeError);
          return new NextResponse('Failed to update payment', { status: 500 });
        }

        // Update payment status
        const { error: updateError } = await supabase
          .from('payments')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);

        if (updateError) {
          console.error('❌ Failed to update payment status:', updateError);
          return new NextResponse('Failed to update payment', { status: 500 });
        }

        break;
      }

      default:
        console.log(`🤔 Unhandled event type: ${event.type}`);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new NextResponse('Webhook error', { status: 500 });
  }
} 
