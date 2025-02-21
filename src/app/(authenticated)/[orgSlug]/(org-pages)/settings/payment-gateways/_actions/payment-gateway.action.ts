'use server';

import { z } from "zod";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { withPermissions } from "@/lib/utils/action-permissions";
import { permissions } from "@/lib/types/permissions";
import { revalidatePath } from "next/cache";

const updateGatewayStatusSchema = z.object({
  enabled: z.boolean(),
});

type ActionResponse = {
  success: boolean;
  error?: string;
  data?: {
    enabled: boolean;
  };
};

async function handleUpdateGatewayStatus(
  context: { userId: string; groupId: string },
  params: { formData: FormData }
): Promise<ActionResponse> {
  try {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    const gatewayId = params.formData.get('id') as string;
    const enabled = params.formData.get('enabled') === 'true';

    const { error } = await supabase
      .from('group_payment_gateways')
      .upsert({
        group_id: context.groupId,
        gateway_id: gatewayId,
        enabled: enabled,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'group_id,gateway_id'
      });

    if (error) throw error;

    // Revalidate the payment gateways page
    revalidatePath('/[orgSlug]/settings/payment-gateways');

    return {
      success: true,
      data: { enabled }
    };
  } catch (error: any) {
    console.error('Error updating payment gateway status:', error);
    return {
      success: false,
      error: error.message || 'Failed to update payment gateway status'
    };
  }
}

function getUpdateGatewayStatusContext(params: { formData: FormData }) {
  const gatewayId = params.formData.get('id') as string;
  return {
    moduleType: 'paymentGateways' as const,
    moduleId: gatewayId,
    requiredPermissions: permissions.paymentGateways.edit
  };
}

export async function updateGatewayStatus(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const handler = await withPermissions(
    handleUpdateGatewayStatus,
    getUpdateGatewayStatusContext
  );

  return handler(prevState, { formData });
}

async function handleConfigureGateway(
  context: { userId: string; groupId: string },
  params: { gatewayId: string; data: any }
) {
  try {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    const { error } = await supabase
      .from('group_payment_gateways')
      .update(params.data)
      .eq('gateway_id', params.gatewayId);

    if (error) throw error;

    return {
      success: true,
      data: params.data
    };
  } catch (error) {
    console.error('Error configuring payment gateway:', error);
    return {
      success: false,
      error: 'Failed to configure payment gateway'
    };
  }
}

function getConfigureGatewayContext(params: { gatewayId: string; data: any }) {
  return {
    moduleType: 'paymentGateways' as const,
    moduleId: params.gatewayId,
    requiredPermissions: permissions.paymentGateways.configure
  };
}

export async function configureGateway(
  gatewayId: string,
  data: any
) {
  const handler = await withPermissions(
    handleConfigureGateway,
    getConfigureGatewayContext
  );
  
  return handler(null, { gatewayId, data });
} 