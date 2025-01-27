import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return new NextResponse('No signature found', { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new NextResponse('Webhook signature verification failed', { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        // Update payment status to approved
        const { error } = await supabase
          .from('payments')
          .update({ status: 'approved' })
          .eq('order_id', orderId)
          .eq('type', 'stripe');

        if (error) {
          console.error('Failed to update payment status:', error);
          return new NextResponse('Failed to update payment status', { status: 500 });
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        // Update payment status to rejected
        const { error } = await supabase
          .from('payments')
          .update({ 
            status: 'rejected',
            notes: paymentIntent.last_payment_error?.message
          })
          .eq('order_id', orderId)
          .eq('type', 'stripe');

        if (error) {
          console.error('Failed to update payment status:', error);
          return new NextResponse('Failed to update payment status', { status: 500 });
        }

        break;
      }
    }

    return new NextResponse('Webhook processed successfully', { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return new NextResponse('Webhook error', { status: 500 });
  }
} 
