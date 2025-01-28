'use server';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

export async function POST(req: Request) {
  try {
    const { accountId } = await req.json();

    if (!accountId) {
      return new NextResponse('Missing account ID', { status: 400 });
    }

    // Generate a login link for the connected account
    const loginLink = await stripe.accounts.createLoginLink(accountId);

    return new NextResponse(JSON.stringify({ url: loginLink.url }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error generating dashboard link:', error);
    return new NextResponse('Failed to generate dashboard link', { status: 500 });
  }
} 