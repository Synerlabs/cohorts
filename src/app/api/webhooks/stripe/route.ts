'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { OrderService } from '@/services/order.service';
import { StripePaymentProvider } from '@/services/payment/providers/stripe-payment.provider';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia'
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Define the event types we handle
type SupportedStripeEvent = 
  | Stripe.Event & { type: 'account.updated' }
  | Stripe.Event & { type: 'account.external_account.created' }
  | Stripe.Event & { type: 'account.external_account.updated' }
  | Stripe.Event & { type: 'account.application.deauthorized' }
  | Stripe.Event & { type: 'payment_intent.succeeded' }
  | Stripe.Event & { type: 'payment_intent.payment_failed' };

// Helper function to determine account status
function determineAccountStatus(account: Stripe.Account): {
  is_active: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  disabled_reason?: string;
  has_external_account: boolean;
} {
  const hasExternalAccount = (account.external_accounts?.data || []).length > 0;

  // Check if account is disabled or has requirements
  if (account.requirements) {
    // First check for explicit disabled reason
    if (account.requirements.disabled_reason) {
      return {
        is_active: false,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        disabled_reason: account.requirements.disabled_reason,
        has_external_account: hasExternalAccount
      };
    }

    // Check for past due requirements
    const pastDueCount = account.requirements.past_due?.length ?? 0;
    if (pastDueCount > 0) {
      return {
        is_active: false,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        disabled_reason: 'requirements.past_due',
        has_external_account: hasExternalAccount
      };
    }

    // Check for pending verification
    const currentlyDueCount = account.requirements.currently_due?.length ?? 0;
    if (currentlyDueCount > 0) {
      return {
        is_active: account.charges_enabled && account.payouts_enabled,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        disabled_reason: 'requirements.pending_verification',
        has_external_account: hasExternalAccount
      };
    }
  }

  // Check capabilities status
  const hasRequiredCapabilities = 
    account.capabilities?.card_payments === 'active' && 
    account.capabilities?.transfers === 'active';

  if (!hasRequiredCapabilities) {
    return {
      is_active: false,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      disabled_reason: 'action_required.requested_capabilities',
      has_external_account: hasExternalAccount
    };
  }

  // Account is fully active
  return {
    is_active: account.charges_enabled && account.payouts_enabled && hasRequiredCapabilities,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    has_external_account: hasExternalAccount
  };
}

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
    console.log('🔔 Processing webhook event:', event.type, 'Event ID:', event.id, 'Created:', new Date(event.created * 1000).toISOString());

    const supabase = await createServiceRoleClient();

    // Handle the event
    const stripeEvent = event as SupportedStripeEvent;
    
    switch (stripeEvent.type) {
      case 'account.updated': {
        const account = stripeEvent.data.object as Stripe.Account;
        console.log('🔄 Stripe Connect account updated:', account.id);

        // Find the organization with this Stripe account
        const { data: settings, error: settingsError } = await supabase
          .from('stripe_connected_accounts')
          .select('org_id, last_synced_at')
          .eq('account_id', account.id)
          .single();

        if (settingsError || !settings) {
          console.error('❌ Failed to find organization with Stripe account:', account.id);
          return new NextResponse('Organization not found', { status: 404 });
        }

        // Check if this event is older than our last sync
        const eventDate = new Date(event.created * 1000);
        const lastSyncDate = settings.last_synced_at ? new Date(settings.last_synced_at) : new Date(0);

        if (eventDate < lastSyncDate) {
          console.log('⏭️ Skipping outdated event:', {
            eventDate: eventDate.toISOString(),
            lastSync: lastSyncDate.toISOString()
          });
          return new NextResponse('OK - Skipped outdated event', { status: 200 });
        }

        // Determine account status
        const { 
          is_active, 
          charges_enabled, 
          payouts_enabled, 
          disabled_reason,
          has_external_account 
        } = determineAccountStatus(account);

        // Prepare the update data
        const updateData = {
          is_active,
          charges_enabled,
          payouts_enabled,
          has_external_account,
          capabilities_status: account.capabilities || {},
          requirements_status: {
            currently_due: account.requirements?.currently_due || [],
            eventually_due: account.requirements?.eventually_due || [],
            past_due: account.requirements?.past_due || []
          },
          verification_status: {
            fields_needed: [],
            verified_fields: []
          },
          disabled_reason: disabled_reason || null,
          requirements_due_date: account.requirements?.current_deadline 
            ? new Date(account.requirements.current_deadline * 1000).toISOString()
            : null,
          last_synced_at: eventDate.toISOString(), // Use event date as sync time
          updated_at: new Date().toISOString()
        };

        // Update the account
        const { error: updateError } = await supabase
          .from('stripe_connected_accounts')
          .update(updateData)
          .eq('org_id', settings.org_id);

        if (updateError) {
          console.error('❌ Failed to update Stripe settings:', updateError);
          return new NextResponse('Failed to update settings', { status: 500 });
        }

        console.log('✅ Updated Stripe Connect account status:', {
          accountId: account.id,
          is_active,
          disabled_reason: disabled_reason || 'none',
          eventDate: eventDate.toISOString()
        });
        break;
      }

      case 'account.external_account.created':
      case 'account.external_account.updated': {
        const accountId = stripeEvent.account as string;
        console.log('🏦 External account updated for Stripe Connect account:', accountId);

        // Find the organization with this Stripe account
        const { data: settings, error: settingsError } = await supabase
          .from('stripe_connected_accounts')
          .select('org_id')
          .eq('account_id', accountId)
          .single();

        if (settingsError || !settings) {
          console.error('❌ Failed to find organization with Stripe account:', accountId);
          return new NextResponse('Organization not found', { status: 404 });
        }

        // Update the account to reflect external account addition
        const { error: updateError } = await supabase
          .from('stripe_connected_accounts')
          .update({
            has_external_account: true,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('org_id', settings.org_id);

        if (updateError) {
          console.error('❌ Failed to update Stripe settings:', updateError);
          return new NextResponse('Failed to update settings', { status: 500 });
        }

        console.log('✅ Updated Stripe Connect account external account status');
        break;
      }

      case 'account.application.deauthorized': {
        const accountId = stripeEvent.account as string;
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

        // Update the account status to inactive and disabled
        const { error: updateError } = await supabase
          .from('stripe_connected_accounts')
          .update({
            is_active: false,
            charges_enabled: false,
            payouts_enabled: false,
            disabled_reason: 'Account disconnected',
            last_synced_at: new Date().toISOString(),
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
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
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
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
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

      default: {
        // Use the original event type for unhandled events
        console.log(`🤔 Unhandled event type: ${event.type}`);
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new NextResponse('Webhook error', { status: 500 });
  }
} 
