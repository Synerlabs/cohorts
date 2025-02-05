import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getOrgById } from '@/services/org.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return new Response('Missing orgId parameter', { status: 400 });
    }

    const { data: org, error: orgError } = await getOrgById(orgId);
    if (orgError || !org) {
      return new Response('Organization not found', { status: 404 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { data: accounts, error } = await supabase
      .from('stripe_connected_accounts')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching connected accounts:', error);
      return new Response('Failed to fetch connected accounts', { status: 500 });
    }

    return new Response(JSON.stringify(accounts), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in GET /api/stripe/connect/accounts:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 