'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrgById } from '@/services/org.service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgId } = body;

    if (!orgId) {
      return new NextResponse('Missing orgId', { status: 400 });
    }

    // Get org details to verify it exists
    const { data: org, error: orgError } = await getOrgById(orgId);
    if (orgError || !org) {
      console.error('Failed to get org:', { error: orgError, orgId });
      return new NextResponse('Organization not found', { status: 404 });
    }

    // Get the connected account details
    const supabase = await createServiceRoleClient();
    const { data: account, error: accountError } = await supabase
      .from('stripe_connected_accounts')
      .select('account_id')
      .eq('org_id', orgId)
      .single();

    if (accountError) {
      console.error('Failed to get connected account:', accountError);
      return new NextResponse('Failed to get connected account', { status: 500 });
    }

    if (!account) {
      return new NextResponse('No connected account found', { status: 404 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia'
    });

    // Delete the account from Stripe
    try {
      await stripe.accounts.del(account.account_id);
    } catch (error: any) {
      console.error('Failed to delete Stripe account:', error);
      // Continue with local deletion even if Stripe deletion fails
      // The account might already be deleted on Stripe's side
    }

    // Delete the account from our database
    const { error: deleteError } = await supabase
      .from('stripe_connected_accounts')
      .delete()
      .eq('org_id', orgId);

    if (deleteError) {
      console.error('Failed to delete connected account from database:', deleteError);
      return new NextResponse('Failed to delete account', { status: 500 });
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error deleting connected account:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 