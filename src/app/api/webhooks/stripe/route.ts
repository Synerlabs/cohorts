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
  console.log('🎯 Stripe webhook received')
  
  try {
    const body = await req.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('❌ No signature')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    // Initialize Stripe provider
    const stripeProvider = new StripePaymentProvider({
      secretKey: process.env.STRIPE_SECRET_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    });

    // Verify webhook signature
    if (!stripeProvider.verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Parse and handle the event
    const event = {
      type: JSON.parse(body).type,
      data: JSON.parse(body)
    };

    console.log('💰 Processing payment webhook:', event.type);

    const result = await stripeProvider.handleWebhookEvent(event);
    const paymentStatus = stripeProvider.mapProviderStatus(result.status);

    // Get the payment record using the payment intent ID
    const supabase = await createServiceRoleClient();
    
    // First find the stripe payment record
    const { data: stripePayment, error: stripePaymentError } = await supabase
      .from('stripe_payments')
      .select('payment_id')
      .eq('stripe_payment_intent_id', result.paymentIntentId)
      .single();

    if (stripePaymentError) {
      console.error('❌ Stripe payment not found:', stripePaymentError);
      return NextResponse.json({ error: 'Stripe payment not found' }, { status: 404 });
    }

    // Then get the payment record with order info
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, order_id')
      .eq('id', stripePayment.payment_id)
      .single();

    if (paymentError || !payment) {
      console.error('❌ Payment not found:', paymentError);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    console.log('✅ Found payment:', payment.id, 'for order:', payment.order_id);

    // Update payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({ status: paymentStatus })
      .eq('id', payment.id);

    if (updateError) {
      console.error('❌ Failed to update payment:', updateError);
      return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
    }

    // Update order status based on all payments
    await OrderService.updateOrderStatusFromPayments(payment.order_id);

    console.log('✅ Payment webhook processed successfully');
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('❌ Error processing webhook:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    )
  }
} 
