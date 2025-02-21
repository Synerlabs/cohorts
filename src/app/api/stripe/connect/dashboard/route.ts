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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      console.error('Missing accountId parameter');
      return NextResponse.json({ error: 'Missing accountId parameter' }, { status: 400 });
    }

    // Get the organization ID for this account
    const serviceClient = await createServiceRoleClient();
    const { data: account, error: accountError } = await serviceClient
      .from('stripe_connected_accounts')
      .select('org_id, account_id')
      .eq('account_id', accountId)
      .single();

    if (accountError || !account) {
      console.error('Account not found:', { accountError, accountId });
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if user has permission to configure payment gateways
    const { hasAccess } = await checkUserAccess({
      userId: user.id,
      groupId: account.org_id,
      requiredPermissions: [permissions.paymentGateways.configure]
    });

    if (!hasAccess) {
      console.error('Permission denied for user:', { userId: user.id, orgId: account.org_id });
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to access Stripe dashboard' },
        { status: 403 }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia'
    });

    try {
      // Generate login link
      const loginLink = await stripe.accounts.createLoginLink(accountId);

      if (!loginLink?.url) {
        console.error('No URL in login link response:', loginLink);
        return NextResponse.json(
          { error: 'Failed to generate dashboard link - No URL returned' },
          { status: 500 }
        );
      }

      return NextResponse.json({ url: loginLink.url });
    } catch (stripeError: any) {
      console.error('Stripe error generating login link:', {
        error: stripeError,
        accountId,
        message: stripeError.message,
        type: stripeError.type
      });
      
      // Handle specific Stripe errors
      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          { error: 'Invalid Stripe account or account not fully set up' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Failed to generate dashboard link: ${stripeError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error generating Stripe dashboard link:', {
      error,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to generate dashboard link' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, orgId } = body;

    if (!accountId || !orgId) {
      console.error('Missing required parameters:', { accountId, orgId });
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Check if user has permission to configure payment gateways
    const { hasAccess } = await checkUserAccess({
      userId: user.id,
      groupId: orgId,
      requiredPermissions: [permissions.paymentGateways.configure]
    });

    if (!hasAccess) {
      console.error('Permission denied for user:', { userId: user.id, orgId });
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to access Stripe dashboard' },
        { status: 403 }
      );
    }

    // Verify the account belongs to the organization
    const serviceClient = await createServiceRoleClient();
    const { data: account, error: accountError } = await serviceClient
      .from('stripe_connected_accounts')
      .select('account_id')
      .eq('org_id', orgId)
      .eq('account_id', accountId)
      .single();

    if (accountError || !account) {
      console.error('Account not found:', { accountError, orgId, accountId });
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia'
    });

    try {
      // Generate login link
      const loginLink = await stripe.accounts.createLoginLink(accountId);

      if (!loginLink?.url) {
        console.error('No URL in login link response:', loginLink);
        return NextResponse.json(
          { error: 'Failed to generate dashboard link - No URL returned' },
          { status: 500 }
        );
      }

      return NextResponse.json({ url: loginLink.url });
    } catch (stripeError: any) {
      console.error('Stripe error generating login link:', {
        error: stripeError,
        accountId,
        message: stripeError.message,
        type: stripeError.type
      });
      
      // Handle specific Stripe errors
      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          { error: 'Invalid Stripe account or account not fully set up' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Failed to generate dashboard link: ${stripeError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error generating Stripe dashboard link:', {
      error,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to generate dashboard link' },
      { status: 500 }
    );
  }
} 