import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkUserAccess } from '@/lib/utils/permissions';
import { permissions } from '@/lib/types/permissions';

const updateGatewaySchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { orgSlug: string; gatewayId: string } }
) {
  try {
    // Get authenticated user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validate request body
    const validatedData = updateGatewaySchema.parse(body);

    // Get group ID from slug
    const { data: group, error: groupError } = await supabase
      .from('group')
      .select('id')
      .eq('slug', params.orgSlug)
      .single();

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Check if user has payment gateway permissions
    const { hasAccess } = await checkUserAccess({
      userId,
      groupId: group.id,
      requiredPermissions: [
        permissions.paymentGateways.edit,
        permissions.paymentGateways.configure
      ]
    });

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to manage payment gateways' },
        { status: 403 }
      );
    }

    // Verify the payment gateway belongs to the group
    const { data: gateway, error: gatewayError } = await supabase
      .from('group_payment_gateways')
      .select('id')
      .eq('group_id', group.id)
      .eq('gateway_id', params.gatewayId)
      .single();

    if (gatewayError || !gateway) {
      return NextResponse.json(
        { error: 'Payment gateway not found for this group' },
        { status: 404 }
      );
    }

    // Update payment gateway status
    const { error: updateError } = await supabase
      .from('group_payment_gateways')
      .upsert({
        group_id: group.id,
        gateway_id: params.gatewayId,
        enabled: validatedData.enabled,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'group_id,gateway_id'
      });

    if (updateError) {
      console.error('Error updating payment gateway:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment gateway' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Successfully ${validatedData.enabled ? 'enabled' : 'disabled'} payment gateway`,
    });
  } catch (error) {
    console.error('Error in payment gateway update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 