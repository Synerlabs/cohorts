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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const stripeSettingsSchema = z.object({
  isTestMode: z.boolean(),
  accountId: z.string().min(1, 'Required').regex(/^acct_/, 'Must be a valid Stripe account ID'),
});

type StripeSettingsFormValues = z.infer<typeof stripeSettingsSchema>;

interface StripeSettingsFormProps {
  orgId: string;
  initialSettings?: {
    accountId?: string;
    isTestMode?: boolean;
  };
}

export function StripeSettingsForm({ orgId, initialSettings }: StripeSettingsFormProps) {
  const form = useForm<StripeSettingsFormValues>({
    resolver: zodResolver(stripeSettingsSchema),
    defaultValues: {
      accountId: initialSettings?.accountId ?? '',
      isTestMode: initialSettings?.isTestMode ?? false
    }
  });

  async function onSubmit(data: StripeSettingsFormValues) {
    try {
      // TODO: Implement updateStripeSettings
      toast({
        title: "Settings updated",
        description: "Your Stripe Connect settings have been saved successfully."
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            {isTestMode ? 'Test Mode' : 'Live Mode'}
          </Label>
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stripe Account ID</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="acct_..." />
                </FormControl>
                <FormDescription>
                  Your Stripe Connect account ID starting with 'acct_'
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full">Save Settings</Button>
      </form>
    </Form>
  );
} 
