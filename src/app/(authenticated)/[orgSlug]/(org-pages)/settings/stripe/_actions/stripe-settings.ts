'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Base schema for test mode fields
const testModeSchema = z.object({
  testPublishableKey: z.string().regex(/^pk_test_/, 'Must be a valid test publishable key'),
  testSecretKey: z.string().regex(/^sk_test_/, 'Must be a valid test secret key'),
  testWebhookSecret: z.string().min(1, 'Required'),
  // Live mode fields are optional when in test mode
  livePublishableKey: z.string().regex(/^pk_live_/, 'Must be a valid live publishable key').optional(),
  liveSecretKey: z.string().regex(/^sk_live_/, 'Must be a valid live secret key').optional(),
  liveWebhookSecret: z.string().optional(),
});

// Base schema for live mode fields
const liveModeSchema = z.object({
  livePublishableKey: z.string().regex(/^pk_live_/, 'Must be a valid live publishable key'),
  liveSecretKey: z.string().regex(/^sk_live_/, 'Must be a valid live secret key'),
  liveWebhookSecret: z.string().min(1, 'Required'),
  // Test mode fields are optional when in live mode
  testPublishableKey: z.string().regex(/^pk_test_/, 'Must be a valid test publishable key').optional(),
  testSecretKey: z.string().regex(/^sk_test_/, 'Must be a valid test secret key').optional(),
  testWebhookSecret: z.string().optional(),
});

const stripeSettingsSchema = z.discriminatedUnion('isTestMode', [
  z.object({ isTestMode: z.literal(true) }).merge(testModeSchema),
  z.object({ isTestMode: z.literal(false) }).merge(liveModeSchema),
]);

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
