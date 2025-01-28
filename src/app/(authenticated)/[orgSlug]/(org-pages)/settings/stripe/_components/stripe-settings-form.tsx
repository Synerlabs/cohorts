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
import { toast } from '@/components/ui/use-toast';
import { updateConnectedAccount } from '../_actions/stripe-settings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const stripeConnectSchema = z.object({
  isTestMode: z.boolean(),
  country: z.string().min(2, 'Required'),
  accountId: z.string().optional(),
  accountStatus: z.enum(['pending', 'active', 'disconnected']).optional(),
});

type StripeConnectFormValues = z.infer<typeof stripeConnectSchema>;

interface StripeConnectFormProps {
  orgId: string;
  initialSettings?: {
    id?: string;
    accountId?: string;
    country?: string;
    isTestMode?: boolean;
    accountStatus?: 'pending' | 'active' | 'disconnected';
  };
}

const countries = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'SG', label: 'Singapore' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IT', label: 'Italy' },
  { value: 'ES', label: 'Spain' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
  { value: 'AT', label: 'Austria' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'IE', label: 'Ireland' },
  { value: 'HK', label: 'Hong Kong' },
] as const;

export function StripeSettingsForm({ orgId, initialSettings }: StripeConnectFormProps) {
  const form = useForm<StripeConnectFormValues>({
    resolver: zodResolver(stripeConnectSchema),
    defaultValues: {
      accountId: initialSettings?.accountId ?? '',
      isTestMode: initialSettings?.isTestMode ?? false,
      country: initialSettings?.country ?? '',
      accountStatus: initialSettings?.accountStatus
    }
  });

  async function onSubmit(data: StripeConnectFormValues) {
    try {
      await updateConnectedAccount(orgId, data);
      toast({
        title: "Settings updated",
        description: "Your Stripe Connect settings have been saved successfully."
      });
    } catch (error) {
      console.error('Failed to update connected account:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update connected account. Please try again."
      });
    }
  }

  const { isTestMode } = form.watch();

  const handleConnect = async () => {
    const values = form.getValues();
    if (!values.country) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a country first."
      });
      return;
    }

    // For new accounts, redirect directly to OAuth flow without saving
    if (!initialSettings?.accountId) {
      window.location.href = `/api/stripe/connect/refresh?state=${orgId}&country=${values.country}&mode=${isTestMode ? 'test' : 'live'}`;
      return;
    }

    // For existing accounts, save before redirecting
    await onSubmit(values);
    window.location.href = `/api/stripe/connect/refresh?state=${orgId}&country=${values.country}&mode=${isTestMode ? 'test' : 'live'}`;
  };

  const handleDashboard = async () => {
    try {
      const response = await fetch('/api/stripe/connect/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: initialSettings?.accountId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate dashboard link');
      }

      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to open dashboard:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to open Stripe dashboard. Please try again."
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!initialSettings?.accountId && (
          <>
            <div className="flex flex-col gap-6 p-4 bg-secondary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
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
                {isTestMode && (
                  <span className="text-sm text-muted-foreground">
                    Perfect for testing your integration
                  </span>
                )}
              </div>

              <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {isTestMode ? (
                    'Test mode uses test API keys and won&apos;t process real payments.'
                  ) : (
                    'Live mode will process real payments. Make sure your business is ready.'
                  )}
                </AlertDescription>
              </Alert>
            </div>

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Country</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries.map(country => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the country where your business is legally registered. This cannot be changed after account creation.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {!initialSettings?.accountId ? (
          <Button
            type="button"
            onClick={handleConnect}
            className="w-full"
            size="lg"
          >
            Connect Stripe Account
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleConnect}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Reconnect Account
            </Button>
            {initialSettings.accountStatus === 'active' && (
              <Button
                type="button"
                onClick={handleDashboard}
                variant="secondary"
                size="lg"
                className="flex items-center gap-2"
              >
                Open Dashboard
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </form>
    </Form>
  );
}
