'use server';

import { createServiceRoleClient, createClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
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

    if (!state) {
      return new NextResponse('Missing state parameter', { status: 400 });
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
      return new NextResponse('Forbidden - Insufficient permissions to configure Stripe account', { status: 403 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia'
    });

    // Get the connected account details
    const serviceClient = await createServiceRoleClient();
    const { data: account, error: accountError } = await serviceClient
      .from('stripe_connected_accounts')
      .select('account_id')
      .eq('org_id', orgId)
      .single();

    if (accountError || !account) {
      return new NextResponse('Account not found', { status: 404 });
    }

    // Get account details from Stripe
    const stripeAccount = await stripe.accounts.retrieve(account.account_id);

    // Update account status
    const { error: updateError } = await serviceClient
      .from('stripe_connected_accounts')
      .update({
        is_active: stripeAccount.charges_enabled && stripeAccount.payouts_enabled && stripeAccount.details_submitted,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        has_external_account: (stripeAccount.external_accounts?.data || []).length > 0,
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
      .eq('account_id', account.account_id);

    if (updateError) {
      console.error('Failed to update account status:', updateError);
      return new NextResponse('Failed to update account status', { status: 500 });
    }

    // Redirect back to the payment gateways page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/@${orgId}/settings/payment-gateways/stripe?success=true`);
  } catch (error) {
    console.error('Error in Stripe Connect return:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 
