'use server';

import { getOrgById } from '@/services/org.service';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const state = requestUrl.searchParams.get('state');

    if (!state) {
      console.error('Missing state parameter in return URL');
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Get org ID from state parameter
    const orgId = state;

    // get org slug using orgId
    const { data, error } = await getOrgById(orgId);

    if (error || !data) {
      console.error('Failed to get org:', { error, orgId });
      return new NextResponse('Organization not found', { status: 404 });
    }

    // Redirect back to the payment gateways settings page
    // Status updates will be handled by webhooks (account.updated events)
    const redirectUrl = `/${data.slug}/settings/payment-gateways/stripe?success=true`;
    console.log('Redirecting to:', redirectUrl);

    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: redirectUrl
      }
    });
  } catch (error) {
    console.error('Error handling Stripe Connect return:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 
