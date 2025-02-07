import { createServiceRoleClient } from "@/lib/utils/supabase/server";

export interface PaymentGatewayStatus {
  enabled: boolean;
  stripeConnected?: boolean;
}

export interface PaymentGatewaysStatus {
  stripe: PaymentGatewayStatus;
  manual: PaymentGatewayStatus;
}

export async function getPaymentGatewaysStatus(groupId: string): Promise<PaymentGatewaysStatus> {
  const supabase = await createServiceRoleClient();

  // Get enabled gateways
  const { data: gateways, error: gatewaysError } = await supabase
    .from('group_payment_gateways')
    .select('gateway_id, enabled')
    .eq('group_id', groupId);

  if (gatewaysError) {
    console.error('Failed to get payment gateways:', gatewaysError);
    throw new Error('Failed to get payment gateways');
  }

  // Get Stripe connected account status
  const { data: stripeAccount, error: stripeError } = await supabase
    .from('stripe_connected_accounts')
    .select('is_active')
    .eq('org_id', groupId)
    .eq('is_active', true)
    .limit(1);

  if (stripeError) {
    console.error('Failed to check Stripe account:', stripeError);
    throw new Error('Failed to check Stripe account');
  }

  const stripeEnabled = gateways?.find(g => g.gateway_id === 'stripe')?.enabled ?? false;
  const manualEnabled = gateways?.find(g => g.gateway_id === 'manual')?.enabled ?? true; // Manual is enabled by default
  const hasActiveStripeAccount = stripeAccount && stripeAccount.length > 0;

  return {
    stripe: {
      enabled: stripeEnabled,
      stripeConnected: hasActiveStripeAccount
    },
    manual: {
      enabled: manualEnabled
    }
  };
} 