'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';

interface StripeConnectedAccount {
  id?: string;
  accountId?: string;
  country: string;
  isTestMode: boolean;
  accountStatus?: 'pending' | 'active' | 'disconnected';
  createdAt?: string;
  updatedAt?: string;
}

export async function getConnectedAccounts(orgId: string) {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('stripe_connected_accounts')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch connected accounts:', error);
    return [];
  }

  return data.map(account => ({
    id: account.id,
    accountId: account.account_id,
    country: account.country,
    isTestMode: account.is_test_mode,
    accountStatus: account.account_status,
    createdAt: account.created_at,
    updatedAt: account.updated_at
  }));
}

export async function updateConnectedAccount(orgId: string, account: StripeConnectedAccount) {
  const supabase = await createServiceRoleClient();

  const data = {
    org_id: orgId,
    account_id: account.accountId,
    country: account.country,
    is_test_mode: account.isTestMode,
    account_status: account.accountStatus,
    updated_at: new Date().toISOString(),
  };

  // If we have an ID, update the existing record
  if (account.id) {
    const { error } = await supabase
      .from('stripe_connected_accounts')
      .update(data)
      .eq('id', account.id);

    if (error) {
      console.error('Failed to update connected account:', error);
      throw new Error('Failed to update connected account');
    }
  } else {
    // Otherwise, insert a new record
    const { error } = await supabase
      .from('stripe_connected_accounts')
      .insert(data);

    if (error) {
      console.error('Failed to create connected account:', error);
      throw new Error('Failed to create connected account');
    }
  }

  revalidatePath(`/@${orgId}/settings/stripe`);
} 
