'use server';

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const state = requestUrl.searchParams.get('state');

    if (!state) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Get org ID from state parameter
    const orgId = state;

    // Redirect back to the Stripe settings page
    // Status updates will be handled by webhooks (account.updated events)
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: `/@${orgId}/settings/stripe?success=true`
      }
    });
  } catch (error) {
    console.error('Error handling Stripe Connect return:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 
