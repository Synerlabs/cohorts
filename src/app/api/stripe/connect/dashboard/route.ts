'use server';

import { NextRequest } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return new Response('Missing accountId parameter', { status: 400 });
    }

    const link = await stripe.accounts.createLoginLink(accountId);

    return new Response(JSON.stringify({ url: link.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in GET /api/stripe/connect/dashboard:', error);
    return new Response('Failed to create dashboard link', { status: 500 });
  }
} 