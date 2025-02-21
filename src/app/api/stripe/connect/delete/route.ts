'use server';

import { createServiceRoleClient, createClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrgById } from '@/services/org.service';
import { checkUserAccess } from '@/lib/utils/permissions';
import { permissions } from '@/lib/types/permissions';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orgId } = body;

    if (!orgId) {
      console.error('Missing orgId in request body');
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    // Get org details to verify it exists
    const { data: org, error: orgError } = await getOrgById(orgId);
    if (orgError || !org) {
      console.error('Failed to get org:', { error: orgError, orgId });
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if user has permission to manage payment gateways
    const { hasAccess } = await checkUserAccess({
      userId: session.user.id,
      groupId: orgId,
      requiredPermissions: [permissions.paymentGateways.configure]
    });

    if (!hasAccess) {
      console.error('Permission denied for user:', { userId: session.user.id, orgId });
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to manage payment gateways' },
        { status: 403 }
      );
    }

    // Get the connected account details
    const serviceClient = await createServiceRoleClient();
    const { data: account, error: accountError } = await serviceClient
      .from('stripe_connected_accounts')
      .select('account_id')
      .eq('org_id', orgId)
      .single();

    if (accountError) {
      console.error('Failed to get connected account:', accountError);
      return NextResponse.json(
        { error: 'Failed to get connected account' },
        { status: 500 }
      );
    }

    if (!account) {
      console.error('No connected account found for org:', orgId);
      return NextResponse.json({ error: 'No connected account found' }, { status: 404 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia'
    });

    try {
      // Delete the account from Stripe
      await stripe.accounts.del(account.account_id);
      console.log('Successfully deleted Stripe account:', account.account_id);
    } catch (stripeError: any) {
      console.warn('Failed to delete Stripe account:', {
        error: stripeError,
        accountId: account.account_id,
        message: stripeError.message,
        type: stripeError.type
      });
      // Continue with local deletion even if Stripe deletion fails
      // The account might already be deleted on Stripe's side
    }

    // Delete the account from our database
    const { error: deleteError } = await serviceClient
      .from('stripe_connected_accounts')
      .delete()
      .eq('org_id', orgId);

    if (deleteError) {
      console.error('Failed to delete connected account from database:', {
        error: deleteError,
        orgId
      });
      return NextResponse.json(
        { error: 'Failed to delete account from database' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting connected account:', {
      error,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 