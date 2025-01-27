'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const stripeSettingsSchema = z.object({
  isTestMode: z.boolean(),
  accountId: z.string().min(1, 'Required').regex(/^acct_/, 'Must be a valid Stripe account ID'),
});

export type StripeSettings = z.infer<typeof stripeSettingsSchema>;

export async function getStripeSettings(orgId: string) {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('stripe_settings')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (error) {
    console.error('Failed to fetch Stripe settings:', error);
    return null;
  }

  return data ? {
    accountId: data.account_id,
    isTestMode: data.is_test_mode
  } : null;
}

export async function updateStripeSettings(orgId: string, settings: StripeSettings) {
  const supabase = await createServiceRoleClient();

  // Generate return and refresh URLs based on the current domain
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const returnUrl = `${baseUrl}/api/stripe/connect/return`;
  const refreshUrl = `${baseUrl}/api/stripe/connect/refresh`;

  const { error } = await supabase
    .from('stripe_settings')
    .upsert({
      org_id: orgId,
      account_id: settings.accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      is_test_mode: settings.isTestMode,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'org_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to update Stripe settings:', error);
    throw new Error('Failed to update Stripe settings');
  }

  revalidatePath('/[orgSlug]/settings/stripe');
} 
