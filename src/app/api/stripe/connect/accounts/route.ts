import { createServiceRoleClient, createClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import { checkUserAccess } from '@/lib/utils/permissions';
import { permissions } from '@/lib/types/permissions';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get orgId from query params
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return new NextResponse('Missing orgId parameter', { status: 400 });
    }

    // Check if user has permission to view payment gateways
    const { hasAccess } = await checkUserAccess({
      userId: session.user.id,
      groupId: orgId,
      requiredPermissions: [permissions.paymentGateways.view]
    });

    if (!hasAccess) {
      return new NextResponse('Forbidden - Insufficient permissions to view payment gateways', { status: 403 });
    }

    // Get connected accounts
    const serviceClient = await createServiceRoleClient();
    const { data: accounts, error } = await serviceClient
      .from('stripe_connected_accounts')
      .select('*')
      .eq('org_id', orgId);

    if (error) {
      console.error('Error fetching connected accounts:', error);
      return new NextResponse('Failed to fetch connected accounts', { status: 500 });
    }

    return NextResponse.json(accounts || []);
  } catch (error) {
    console.error('Error in connected accounts route:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 