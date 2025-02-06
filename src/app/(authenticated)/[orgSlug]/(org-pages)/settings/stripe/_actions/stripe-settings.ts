'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export interface StripeConnectAccount {
  id: string;
  account_id: string;
  country: string;
  is_test_mode: boolean;
  is_active: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  disabled_reason?: string;
  requirements_status: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface SaveStripeConnectAccountParams {
  orgId: string;
  accountId: string;
  country: string;
  isTestMode: boolean;
  isActive: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  disabledReason?: string;
  requirementsStatus: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
}

export async function getConnectedAccount(orgId: string, accountId: string): Promise<StripeConnectAccount | null> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('stripe_connected_accounts')
    .select('*')
    .eq('org_id', orgId)
    .eq('account_id', accountId)
    .single();

  if (error) {
    console.error('Failed to get connected account:', { error, orgId, accountId });
    return null;
  }

  return data;
}

export async function getConnectedAccounts(orgId: string): Promise<StripeConnectAccount[]> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('stripe_connected_accounts')
    .select('*')
    .eq('org_id', orgId);

  if (error) {
    console.error('Failed to get connected accounts:', { error, orgId });
    throw error;
  }

  return data || [];
}

export async function updateConnectedAccount(orgId: string, account: SaveStripeConnectAccountParams) {
  const supabase = await createServiceRoleClient();

  const data = {
    org_id: orgId,
    account_id: account.accountId,
    country: account.country,
    is_test_mode: account.isTestMode,
    is_active: account.isActive,
    charges_enabled: account.chargesEnabled,
    payouts_enabled: account.payoutsEnabled,
    disabled_reason: account.disabledReason,
    requirements_status: account.requirementsStatus,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('stripe_connected_accounts')
    .upsert(data);

  if (error) {
    console.error('Failed to update connected account:', error);
    throw new Error('Failed to update connected account');
  }

  revalidatePath(`/@${orgId}/settings/stripe`);
}

export async function saveStripeConnectAccount(params: SaveStripeConnectAccountParams) {
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from('stripe_connected_accounts')
    .upsert({
      org_id: params.orgId,
      account_id: params.accountId,
      country: params.country,
      is_test_mode: params.isTestMode,
      is_active: params.isActive,
      charges_enabled: params.chargesEnabled,
      payouts_enabled: params.payoutsEnabled,
      disabled_reason: params.disabledReason,
      requirements_status: params.requirementsStatus,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Failed to save connected account:', { error, orgId: params.orgId, accountId: params.accountId });
    throw error;
  }
} 
