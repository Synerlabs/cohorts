'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const accountId = requestUrl.searchParams.get('accountId');

    if (!accountId) {
      console.error('Missing accountId parameter');
      return new NextResponse('Missing accountId parameter', { status: 400 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-01-27.acacia'
    });

    // Generate a login link for the connected account
    const loginLink = await stripe.accounts.createLoginLink(accountId);

    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    console.error('Error generating Stripe dashboard link:', error);
    return new NextResponse('Failed to generate dashboard link', { status: 500 });
  }
} 