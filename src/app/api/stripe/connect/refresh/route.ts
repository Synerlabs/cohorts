'use server';

import { createServiceRoleClient, createClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrgById } from '@/services/org.service';
import { checkUserAccess } from '@/lib/utils/permissions';
import { permissions } from '@/lib/types/permissions';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

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

    // Check if user has permission to configure payment gateways
    const { hasAccess } = await checkUserAccess({
      userId: session.user.id,
      groupId: orgId,
      requiredPermissions: [permissions.paymentGateways.configure]
    });

    if (!hasAccess) {
      return new NextResponse('Forbidden - Insufficient permissions to refresh Stripe account', { status: 403 });
    }

    // Get org details
    const { data: org, error: orgError } = await getOrgById(orgId);
    if (orgError || !org) {
      console.error('Failed to get org:', { error: orgError, orgId });
      return new NextResponse('Organization not found', { status: 404 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-01-27.acacia'
    });

    // Check if there's an existing account
    const supabaseClient = await createServiceRoleClient();
    const { data: existingAccount, error: accountError } = await supabaseClient
      .from('stripe_connected_accounts')
      .select('account_id')
      .eq('org_id', orgId)
      .single();

    let accountId = existingAccount?.account_id;

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
        const { error: deleteError } = await supabaseClient
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
    const { error } = await supabaseClient
      .from('stripe_connected_accounts')
      .upsert({
        org_id: orgId,
        account_id: account.id,
        country: account.country,
        is_test_mode: isTestMode,
        is_active: false, // Will be updated by webhook
        charges_enabled: false, // Will be updated by webhook
        payouts_enabled: false, // Will be updated by webhook
        has_external_account: false,
        capabilities_status: {},
        requirements_status: {
          currently_due: [],
          eventually_due: [],
          past_due: []
        },
        verification_status: {
          fields_needed: [],
          verified_fields: []
        },
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to save connected account:', {
        error: error,
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

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { orgId } = await request.json();

    if (!orgId) {
      return new NextResponse('Missing orgId parameter', { status: 400 });
    }

    // Check if user has permission to configure payment gateways
    const { hasAccess } = await checkUserAccess({
      userId: session.user.id,
      groupId: orgId,
      requiredPermissions: [permissions.paymentGateways.configure]
    });

    if (!hasAccess) {
      return new NextResponse('Forbidden - Insufficient permissions to refresh Stripe account', { status: 403 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia'
    });

    // Get existing account if any
    const serviceClient = await createServiceRoleClient();
    const { data: existingAccount } = await serviceClient
      .from('stripe_connected_accounts')
      .select('account_id')
      .eq('org_id', orgId)
      .single();

    let accountId = existingAccount?.account_id;

    if (!accountId) {
      // Create a new account
      const account = await stripe.accounts.create({
        type: 'standard',
        metadata: {
          org_id: orgId
        }
      });

      accountId = account.id;

      // Save the new account
      const { error: insertError } = await serviceClient
        .from('stripe_connected_accounts')
        .insert({
          org_id: orgId,
          account_id: accountId,
          is_active: false,
          charges_enabled: false,
          payouts_enabled: false,
          has_external_account: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error saving new account:', insertError);
        return new NextResponse('Failed to save account', { status: 500 });
      }
    }

    // Generate account link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/@${orgId}/settings/payment-gateways/stripe?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/@${orgId}/settings/payment-gateways/stripe?success=true`,
      type: 'account_onboarding'
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error refreshing Stripe account:', error);
    return new NextResponse('Failed to refresh account', { status: 500 });
  }
} 
