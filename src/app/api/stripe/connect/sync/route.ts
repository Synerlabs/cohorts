'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      console.error('Missing accountId parameter');
      return new NextResponse('Missing accountId parameter', { status: 400 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-01-27.acacia'
    });

    // Get account details from Stripe
    const stripeAccount = await stripe.accounts.retrieve(accountId);

    // Check account status
    const isActive = stripeAccount.charges_enabled && stripeAccount.payouts_enabled && stripeAccount.details_submitted;
    const hasExternalAccount = (stripeAccount.external_accounts?.data || []).length > 0;

    const supabase = await createServiceRoleClient();

    // Update account status
    const { error: updateError } = await supabase
      .from('stripe_connected_accounts')
      .update({
        is_active: isActive,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        has_external_account: hasExternalAccount,
        capabilities_status: stripeAccount.capabilities,
        requirements_status: {
          currently_due: stripeAccount.requirements?.currently_due || [],
          eventually_due: stripeAccount.requirements?.eventually_due || [],
          past_due: stripeAccount.requirements?.past_due || []
        },
        verification_status: {
          fields_needed: [],
          verified_fields: []
        },
        requirements_due_date: stripeAccount.requirements?.current_deadline 
          ? new Date(stripeAccount.requirements.current_deadline * 1000).toISOString()
          : null,
        disabled_reason: stripeAccount.requirements?.disabled_reason || null,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq('account_id', accountId);

    if (updateError) {
      console.error('Failed to update account status:', updateError);
      return new NextResponse('Failed to update account status', { status: 500 });
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error syncing Stripe account:', error);
    return new NextResponse('Failed to sync account', { status: 500 });
  }
} 