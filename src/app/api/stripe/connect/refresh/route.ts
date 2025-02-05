'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrgById } from '@/services/org.service';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const state = requestUrl.searchParams.get('state');
    const country = requestUrl.searchParams.get('country');
    const isTestMode = requestUrl.searchParams.get('mode') === 'test';

    if (!state || !country) {
      console.error('Missing required parameters:', { state, country });
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Get org ID from state parameter
    const orgId = state;

    // Get org details
    const { data: org, error: orgError } = await getOrgById(orgId);
    if (orgError || !org) {
      console.error('Failed to get org:', { error: orgError, orgId });
      return new NextResponse('Organization not found', { status: 404 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia'
    });

    // Check if there's an existing account
    const supabase = await createServiceRoleClient();
    const { data: existingAccount, error: accountError } = await supabase
      .from('stripe_connected_accounts')
      .select('account_id')
      .eq('org_id', orgId)
      .single();

    if (accountError && accountError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Failed to check existing account:', accountError);
      return new NextResponse('Failed to check existing account', { status: 500 });
    }

    // If there's an existing account, delete it first
    if (existingAccount) {
      try {
        // Try to delete from Stripe (might fail if already deleted)
        try {
          await stripe.accounts.del(existingAccount.account_id);
        } catch (error) {
          console.warn('Could not delete Stripe account (might be already deleted):', error);
        }

        // Delete from our database
        const { error: deleteError } = await supabase
          .from('stripe_connected_accounts')
          .delete()
          .eq('org_id', orgId);

        if (deleteError) {
          console.error('Failed to delete existing account:', deleteError);
          return new NextResponse('Failed to delete existing account', { status: 500 });
        }
      } catch (error) {
        console.error('Failed to clean up existing account:', error);
        return new NextResponse('Failed to clean up existing account', { status: 500 });
      }
    }

    // Create a new Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    });

    console.log('Created Stripe account:', {
      accountId: account.id,
      orgId,
      country,
      isTestMode
    });

    // Save the account ID
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
      console.error('Failed to save connected account:', {
        error: updateError,
        orgId,
        accountId: account.id
      });
      return new NextResponse('Failed to save connected account', { status: 500 });
    }

    const settingsUrl = `/${org.slug}/settings/payment-gateways/stripe`;

    // Generate account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/refresh?state=${orgId}&country=${country}&mode=${isTestMode ? 'test' : 'live'}&return_to=${encodeURIComponent(settingsUrl)}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/return?state=${orgId}`,
      type: 'account_onboarding',
    });

    console.log('Generated account link:', {
      accountId: account.id,
      refreshUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/refresh?state=${orgId}&country=${country}&mode=${isTestMode ? 'test' : 'live'}&return_to=${encodeURIComponent(settingsUrl)}`,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/return?state=${orgId}`
    });

    // Check if this is a refresh request
    const returnTo = requestUrl.searchParams.get('return_to');
    if (returnTo) {
      console.log('Refresh request detected, returning to:', returnTo);
      return new NextResponse(null, {
        status: 302,
        headers: {
          Location: `${returnTo}?error=refresh`
        }
      });
    }

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
