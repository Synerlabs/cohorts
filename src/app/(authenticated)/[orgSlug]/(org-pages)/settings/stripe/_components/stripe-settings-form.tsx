'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { updateStripeSettings } from '../_actions/stripe-settings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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

const stripeSettingsSchema = z.object({
  livePublishableKey: z.string(),
  liveSecretKey: z.string(),
  liveWebhookSecret: z.string(),
  testPublishableKey: z.string(),
  testSecretKey: z.string(),
  testWebhookSecret: z.string(),
  isTestMode: z.boolean()
}).superRefine((data, ctx) => {
  if (data.isTestMode) {
    // Validate test mode fields
    if (!data.testPublishableKey || !data.testPublishableKey.startsWith('pk_test_')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be a valid test publishable key',
        path: ['testPublishableKey']
      });
    }
    if (!data.testSecretKey || !data.testSecretKey.startsWith('sk_test_')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be a valid test secret key',
        path: ['testSecretKey']
      });
    }
    if (!data.testWebhookSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Required',
        path: ['testWebhookSecret']
      });
    }
  } else {
    // Validate live mode fields
    if (!data.livePublishableKey || !data.livePublishableKey.startsWith('pk_live_')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be a valid live publishable key',
        path: ['livePublishableKey']
      });
    }
    if (!data.liveSecretKey || !data.liveSecretKey.startsWith('sk_live_')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be a valid live secret key',
        path: ['liveSecretKey']
      });
    }
    if (!data.liveWebhookSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Required',
        path: ['liveWebhookSecret']
      });
    }
  }
});

type StripeSettingsFormValues = z.infer<typeof stripeSettingsSchema>;

interface StripeSettingsFormProps {
  orgId: string;
  initialSettings?: {
    livePublishableKey?: string;
    liveSecretKey?: string;
    liveWebhookSecret?: string;
    testPublishableKey?: string;
    testSecretKey?: string;
    testWebhookSecret?: string;
    isTestMode?: boolean;
  };
}

export function StripeSettingsForm({ orgId, initialSettings }: StripeSettingsFormProps) {
  const form = useForm<StripeSettingsFormValues>({
    resolver: zodResolver(stripeSettingsSchema),
    defaultValues: {
      livePublishableKey: initialSettings?.livePublishableKey ?? '',
      liveSecretKey: initialSettings?.liveSecretKey ?? '',
      liveWebhookSecret: initialSettings?.liveWebhookSecret ?? '',
      testPublishableKey: initialSettings?.testPublishableKey ?? '',
      testSecretKey: initialSettings?.testSecretKey ?? '',
      testWebhookSecret: initialSettings?.testWebhookSecret ?? '',
      isTestMode: initialSettings?.isTestMode ?? false
    }
  });

  async function onSubmit(data: StripeSettingsFormValues) {
    try {
      await updateStripeSettings(orgId, data);
      toast({
        title: "Settings updated",
        description: "Your Stripe settings have been saved successfully."
      });
    } catch (error) {
      console.error('Failed to update Stripe settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update Stripe settings. Please try again."
      });
    }
  }

  const { isTestMode } = form.watch();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
        <div className="flex items-center space-x-3 bg-secondary/20 p-4 rounded-lg">
          <FormField
            control={form.control}
            name="isTestMode"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Label className="font-medium">
            {isTestMode ? 'Test Mode (Using test API keys)' : 'Live Mode (Using live API keys)'}
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[3fr,2fr] gap-8">
          <div className={isTestMode ? 'opacity-40 pointer-events-none transition-opacity' : 'transition-opacity'}>
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Live Environment</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="livePublishableKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Live Publishable Key</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="pk_live_..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="liveSecretKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Live Secret Key</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="sk_live_..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="liveWebhookSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Live Webhook Secret</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="whsec_..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <div className={!isTestMode ? 'opacity-40 pointer-events-none transition-opacity' : 'transition-opacity'}>
            <div className="bg-secondary/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Test Environment</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="testPublishableKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Publishable Key</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="pk_test_..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testSecretKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Secret Key</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="sk_test_..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testWebhookSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Webhook Secret</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="whsec_..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full md:w-auto">Save Settings</Button>
      </form>
    </Form>
  );
}
