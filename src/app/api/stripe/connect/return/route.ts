'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const state = requestUrl.searchParams.get('state');

    if (!state) {
      console.error('Missing state parameter');
      return new NextResponse('Missing state parameter', { status: 400 });
    }

    // Get org ID from state parameter
    const orgId = state;

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-01-27.acacia'
    });

    // Get the connected account ID
    const supabase = await createServiceRoleClient();
    const { data: account, error: accountError } = await supabase
      .from('stripe_connected_accounts')
      .select('account_id')
      .eq('org_id', orgId)
      .single();

    if (accountError || !account?.account_id) {
      console.error('Failed to get connected account:', { error: accountError, orgId });
      return new NextResponse('Failed to get connected account', { status: 500 });
    }

    // Get account details from Stripe
    const stripeAccount = await stripe.accounts.retrieve(account.account_id);

    // Check account status
    const isActive = stripeAccount.charges_enabled && stripeAccount.payouts_enabled && stripeAccount.details_submitted;
    const hasExternalAccount = (stripeAccount.external_accounts?.data || []).length > 0;

    // Get org details
    const { data: org, error: orgError } = await supabase
      .from('group')
      .select('slug')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      console.error('Failed to get org:', { error: orgError, orgId });
      return new NextResponse('Organization not found', { status: 404 });
    }

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
      .eq('org_id', orgId);

    if (updateError) {
      console.error('Failed to update account status:', { error: updateError, orgId });
      return new NextResponse('Failed to update account status', { status: 500 });
    }

    // Redirect to settings page with status
    const redirectUrl = new URL(`/@${org.slug}/settings/payment-gateways/stripe`, process.env.NEXT_PUBLIC_APP_URL);
    
    // Add status parameters
    redirectUrl.searchParams.set('status', isActive ? 'active' : 'pending');
    if (!isActive) {
      if (stripeAccount.requirements?.disabled_reason) {
        redirectUrl.searchParams.set('error', stripeAccount.requirements.disabled_reason);
      } else if (stripeAccount.requirements?.currently_due?.length) {
        redirectUrl.searchParams.set('warning', 'verification_pending');
        
        // Add additional context about what's needed
        const pendingItems = [
          ...(stripeAccount.requirements.currently_due || []),
          ...(stripeAccount.requirements.past_due || [])
        ];
        if (pendingItems.length > 0) {
          redirectUrl.searchParams.set('pending_items', pendingItems.join(','));
        }
      }
    }

    // Add capability information
    if (stripeAccount.capabilities) {
      const pendingCapabilities = Object.entries(stripeAccount.capabilities)
        .filter(([_, status]) => status !== 'active')
        .map(([key]) => key);
      if (pendingCapabilities.length > 0) {
        redirectUrl.searchParams.set('pending_capabilities', pendingCapabilities.join(','));
      }
    }

    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString()
      }
    });
  } catch (error) {
    console.error('Error handling Stripe Connect return:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 
