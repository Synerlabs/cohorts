import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { checkUserAccess } from '@/lib/utils/permissions';
import { permissions } from '@/lib/types/permissions';

type Payment = {
  id: string;
  status: string;
  amount: number;
  type: string;
};

type Order = {
  id: string;
  user_id: string;
  group_id: string | null;
  status: string;
  payments: Payment[] | null;
};

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    // Get authenticated user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const orderId = params.orderId;

    // Get order details with group info
    const serviceClient = await createServiceRoleClient();
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .select(`
        *,
        payments (
          id,
          status,
          amount,
          type
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Error fetching order status:', orderError);
      return NextResponse.json({ error: 'Failed to fetch order status' }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    // 1. User owns the order
    const isOwner = order.user_id === userId;

    // 2. User has view permissions in the group
    let hasGroupPermission = false;
    if (order.group_id) {
      const { hasAccess } = await checkUserAccess({
        userId,
        groupId: order.group_id,
        requiredPermissions: permissions.orders.view
      });
      hasGroupPermission = hasAccess;
    }

    // Return 403 if user doesn't have permission
    if (!isOwner && !hasGroupPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate total paid amount from approved/paid payments
    const totalPaid = order.payments
      ?.filter((p: Payment) => p.status === 'approved' || p.status === 'paid')
      ?.reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0) ?? 0;

    // Check for any pending Stripe payments
    const hasPendingStripePayment = order.payments?.some(
      (p: Payment) => p.type === 'stripe' && p.status === 'pending'
    );

    return NextResponse.json({
      status: order.status,
      totalPaid,
      hasPendingPayment: hasPendingStripePayment
    });
  } catch (error) {
    console.error('Error in payment status check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 