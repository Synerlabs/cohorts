'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const state = requestUrl.searchParams.get('state');
    const country = requestUrl.searchParams.get('country');
    const isTestMode = requestUrl.searchParams.get('mode') === 'test';

    if (!state || !country) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Get org ID from state parameter
    const orgId = state;

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia'
    });

    // Create a Stripe Connect account first
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    });

    // Save the account ID
    const supabase = await createServiceRoleClient();
    const { error: updateError } = await supabase
      .from('stripe_connected_accounts')
      .insert({
        org_id: orgId,
        account_id: account.id,
        country,
        is_test_mode: isTestMode,
        account_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (updateError) {
      console.error('Failed to save connected account:', updateError);
      return new NextResponse('Failed to save connected account', { status: 500 });
    }

    // Generate account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/refresh?state=${orgId}&country=${country}&mode=${isTestMode ? 'test' : 'live'}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/return?state=${orgId}`,
      type: 'account_onboarding',
    });

    // Redirect to Stripe Connect onboarding
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: accountLink.url
      }
    });
  } catch (error) {
    console.error('Error handling Stripe Connect refresh:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 
