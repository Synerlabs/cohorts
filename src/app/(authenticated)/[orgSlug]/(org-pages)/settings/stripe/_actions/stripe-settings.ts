'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const stripeSettingsSchema = z.object({
  livePublishableKey: z.string().regex(/^pk_live_/, 'Must be a valid live publishable key').optional(),
  liveSecretKey: z.string().regex(/^sk_live_/, 'Must be a valid live secret key').optional(),
  liveWebhookSecret: z.string().optional(),
  testPublishableKey: z.string().regex(/^pk_test_/, 'Must be a valid test publishable key').optional(),
  testSecretKey: z.string().regex(/^sk_test_/, 'Must be a valid test secret key').optional(),
  testWebhookSecret: z.string().optional(),
  isTestMode: z.boolean()
}).refine((data) => {
  if (data.isTestMode) {
    // In test mode, require test keys
    return data.testPublishableKey && data.testSecretKey && data.testWebhookSecret;
  } else {
    // In live mode, require live keys
    return data.livePublishableKey && data.liveSecretKey && data.liveWebhookSecret;
  }
}, {
  message: "Required fields are missing for the selected mode"
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

  // Transform snake_case to camelCase
  return data ? {
    livePublishableKey: data.live_publishable_key,
    liveSecretKey: data.live_secret_key,
    liveWebhookSecret: data.live_webhook_secret,
    testPublishableKey: data.test_publishable_key,
    testSecretKey: data.test_secret_key,
    testWebhookSecret: data.test_webhook_secret,
    isTestMode: data.is_test_mode
  } : null;
}

export async function updateStripeSettings(orgId: string, settings: StripeSettings) {
  const supabase = await createServiceRoleClient();

  // Transform camelCase to snake_case
  const { error } = await supabase
    .from('stripe_settings')
    .upsert({
      org_id: orgId,
      live_publishable_key: settings.livePublishableKey,
      live_secret_key: settings.liveSecretKey,
      live_webhook_secret: settings.liveWebhookSecret,
      test_publishable_key: settings.testPublishableKey,
      test_secret_key: settings.testSecretKey,
      test_webhook_secret: settings.testWebhookSecret,
      is_test_mode: settings.isTestMode,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to update Stripe settings:', error);
    throw new Error('Failed to update Stripe settings');
  }

  revalidatePath('/[orgSlug]/settings/stripe');
} 
