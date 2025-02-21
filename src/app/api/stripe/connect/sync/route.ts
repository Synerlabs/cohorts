'use server';

import { createServiceRoleClient, createClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { checkUserAccess } from '@/lib/utils/permissions';
import { permissions } from '@/lib/types/permissions';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      console.error('Missing accountId parameter');
      return new NextResponse('Missing accountId parameter', { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the organization ID for this account
    const serviceClient = await createServiceRoleClient();
    const { data: account, error: accountError } = await serviceClient
      .from('stripe_connected_accounts')
      .select('org_id')
      .eq('account_id', accountId)
      .single();

    if (accountError || !account) {
      console.error('Failed to get account:', accountError);
      return new NextResponse('Account not found', { status: 404 });
    }

    // Check if user has permission to manage payment gateways
    const { hasAccess } = await checkUserAccess({
      userId: session.user.id,
      groupId: account.org_id,
      requiredPermissions: [permissions.paymentGateways.configure]
    });

    if (!hasAccess) {
      return new NextResponse('Unauthorized', { status: 403 });
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

    // Update account status
    const { error: updateError } = await serviceClient
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