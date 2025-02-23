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

    const id = params.formData.get('id') as string;
    const gatewayId = params.formData.get('gateway_id') as string;
    const enabled = params.formData.get('enabled') === 'true';

    // If we have an ID, update the existing record
    if (id) {
      const { error } = await supabase
        .from('group_payment_gateways')
        .update({
          enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('group_id', context.groupId);

      if (error) throw error;
    } else {
      // If no ID, create a new record using gateway_id
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
    }

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
  const id = params.formData.get('id') as string;
  const gatewayId = params.formData.get('gateway_id') as string;
  const groupId = params.formData.get('groupId') as string;
  
  if (!groupId) {
    throw new Error('Group ID is required');
  }

  // For upsert operations without an ID, treat it as a creation
  if (!id) {
    if (!gatewayId) {
      throw new Error('Gateway ID is required for creation');
    }
    return {
      moduleType: 'paymentGateways' as const,
      groupId,
      requiredPermissions: permissions.paymentGateways.edit,
      isCreation: true
    };
  }

  // If we have an ID, treat it as an edit operation
  return {
    moduleType: 'paymentGateways' as const,
    moduleId: id,
    groupId,
    requiredPermissions: permissions.paymentGateways.edit,
    isCreation: false
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
  params: { gatewayId: string; data: any; groupId: string }
) {
  try {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    const { error } = await supabase
      .from('group_payment_gateways')
      .update(params.data)
      .eq('gateway_id', params.gatewayId)
      .eq('group_id', context.groupId);

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

function getConfigureGatewayContext(params: { gatewayId: string; data: any; groupId: string }) {
  return {
    moduleType: 'paymentGateways' as const,
    moduleId: params.gatewayId,
    groupId: params.groupId,
    requiredPermissions: permissions.paymentGateways.configure
  };
}

export async function configureGateway(
  gatewayId: string,
  data: any,
  groupId: string
) {
  const handler = await withPermissions(
    handleConfigureGateway,
    getConfigureGatewayContext
  );
  
  return handler(null, { gatewayId, data, groupId });
} 