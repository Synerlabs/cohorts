'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';

interface StripeSettings {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
}

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

  return data;
}

export async function updateStripeSettings(orgId: string, settings: StripeSettings) {
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from('stripe_settings')
    .upsert({
      org_id: orgId,
      publishable_key: settings.publishableKey,
      secret_key: settings.secretKey,
      webhook_secret: settings.webhookSecret,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to update Stripe settings:', error);
    throw new Error('Failed to update Stripe settings');
  }

  revalidatePath(`/@${orgId}/settings/stripe`);
} 