'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const updateGatewaySchema = z.object({
  enabled: z.boolean(),
  gatewayId: z.string(),
  orgSlug: z.string(),
});

export async function updateGatewayStatus(data: z.infer<typeof updateGatewaySchema>) {
  try {
    const validatedData = updateGatewaySchema.parse(data);
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    // Get group ID from slug
    const { data: group, error: groupError } = await supabase
      .from('group')
      .select('id')
      .eq('slug', validatedData.orgSlug)
      .single();

    if (groupError || !group) {
      throw new Error('Group not found');
    }

    // Update payment gateway status
    const { error: updateError } = await supabase
      .from('group_payment_gateways')
      .upsert({
        group_id: group.id,
        gateway_id: validatedData.gatewayId,
        enabled: validatedData.enabled,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'group_id,gateway_id'
      });

    if (updateError) {
      console.error("ACTUAL", updateError);
      throw new Error('Failed to update payment gateway');
    }

    // Revalidate the page to show updated data
    revalidatePath(`/${validatedData.orgSlug}/settings/payment-gateways`);

    return {
      success: true,
      message: `Successfully ${validatedData.enabled ? 'enabled' : 'disabled'} payment gateway`,
    };
  } catch (error) {
    console.error('Error in updateGatewayStatus:', error);
    throw error;
  }
} 