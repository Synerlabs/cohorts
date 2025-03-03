import { createServiceRoleClient, createClient } from '@/lib/utils/supabase/server';
import { XenditPaymentService } from '@/services/payment/xendit-payment.service';
import { NextResponse } from 'next/server';
import { checkUserAccess } from '@/lib/utils/permissions';
import { permissions } from '@/lib/types/permissions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, orgId, userId, amount, currency, successUrl, failureUrl, customerName, customerEmail } = body;

    // Validate required fields
    if (!orderId || !orgId || !amount || !currency) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the authenticated user from the session
    const authClient = await createClient();
    const { data: { session } } = await authClient.auth.getSession();
    const authenticatedUserId = session?.user?.id;
    
    if (!authenticatedUserId) {
      return NextResponse.json(
        { message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Determine if we're using the authenticated user or a different user (admin scenario)
    const userIdToUse = userId || authenticatedUserId;
    
    // If the authenticated user is not the same as the userId provided, check for admin permissions
    if (authenticatedUserId !== userIdToUse) {
      // Check if the authenticated user has payment management permissions
      const { hasAccess } = await checkUserAccess({
        userId: authenticatedUserId,
        groupId: orgId,
        requiredPermissions: [permissions.payments.process]
      });

      if (!hasAccess) {
        return NextResponse.json(
          { message: 'Insufficient permissions to process payments for other users' },
          { status: 403 }
        );
      }
    }

    // For users processing their own payments, check they have access to the organization
    const supabase = await createServiceRoleClient();
    const { data: groupUser, error: groupUserError } = await supabase
      .from('group_users')
      .select('*')
      .eq('group_id', orgId)
      .eq('user_id', userIdToUse)
      .single();

    if (groupUserError || !groupUser) {
      return NextResponse.json(
        { message: 'User does not have access to this organization' },
        { status: 403 }
      );
    }

    // Verify the order belongs to the specified organization
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, 
        product_id,
        products:product_id (
          group_id
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order belongs to the organization
    const productGroupId = order.products?.[0]?.group_id;
    if (productGroupId !== orgId) {
      return NextResponse.json(
        { message: 'Order does not belong to this organization' },
        { status: 403 }
      );
    }

    // Verify the payment gateway is enabled for this organization
    const { data: paymentGateway, error: gatewayError } = await supabase
      .from('group_payment_gateways')
      .select('*')
      .eq('group_id', orgId)
      .eq('gateway_id', 'xendit')
      .eq('enabled', true)
      .single();

    if (gatewayError || !paymentGateway) {
      return NextResponse.json(
        { message: 'Xendit payments are not enabled for this organization' },
        { status: 403 }
      );
    }

    // Create the Xendit payment
    const xenditPaymentService = new XenditPaymentService();
    const payment = await xenditPaymentService.createPayment({
      orderId,
      orgId,
      userId: userIdToUse,
      type: 'xendit',
      amount,
      currency,
      successUrl,
      failureUrl,
      customerName,
      customerEmail
    });

    // Return the payment details with the checkout URL
    return NextResponse.json({
      id: payment.id,
      // Get the invoice URL from the Xendit-specific data
      invoiceUrl: payment.type === 'xendit' ? 
        `https://checkout.xendit.co/web/${payment.xenditInvoiceId}` : '',
      status: payment.status
    });
  } catch (error: any) {
    console.error('Error creating Xendit payment:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create payment' },
      { status: 500 }
    );
  }
} 