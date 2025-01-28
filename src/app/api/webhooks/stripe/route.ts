'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  console.log('🎯 Stripe webhook received')
  
  try {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('❌ No signature')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    console.log(`✨ Webhook event received: ${event.type}`)
    console.log('📦 Event data:', JSON.stringify(event.data.object, null, 2))

    const supabase = await createServiceRoleClient();

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        console.log(`🔄 Processing account update for ${account.id}`)
        console.log('Account details:', {
          id: account.id,
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled
        })

        const { error } = await supabase
          .from('stripe_connected_accounts')
          .update({
            account_status: account.details_submitted ? 'active' : 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('account_id', account.id)

        if (error) {
          console.error('❌ Error updating account status:', error)
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }
        console.log('✅ Account status updated successfully')
        break
      }

      case 'account.application.deauthorized': {
        const application = event.data.object as any
        const accountId = application.account
        console.log(`🔒 Processing deauthorization for ${accountId}`)

        const { error } = await supabase
          .from('stripe_connected_accounts')
          .update({
            account_status: 'disconnected',
            updated_at: new Date().toISOString(),
          })
          .eq('account_id', accountId)

        if (error) {
          console.error('❌ Error updating account status:', error)
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }
        console.log('✅ Account marked as disconnected')
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        // Update payment status to paid
        const { error } = await supabase
          .from('payments')
          .update({ status: 'paid' })
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

        // Update payment status to failed
        const { error } = await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('order_id', orderId)
          .eq('type', 'stripe');

        if (error) {
          console.error('Failed to update payment status:', error);
          return new NextResponse('Failed to update payment status', { status: 500 });
        }

        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`)
    }

    console.log('✅ Webhook processed successfully')
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('❌ Webhook error:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    )
  }
} 
