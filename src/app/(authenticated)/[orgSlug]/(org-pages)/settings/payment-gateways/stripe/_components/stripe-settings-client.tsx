'use client';

import { StripeSettingsForm } from '../../../stripe/_components/stripe-settings-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';
import { ConnectedAccountsList } from './connected-accounts-list';

interface StripeSettingsClientProps {
  params: { orgSlug: string };
  orgId: string;
}

export function StripeSettingsClient({ params, orgId }: StripeSettingsClientProps) {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const error = searchParams.get('error');

  useEffect(() => {
    if (success === 'true') {
      toast({
        title: "Success",
        description: "Your Stripe account has been successfully connected.",
      });
    } else if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error || "Failed to connect Stripe account.",
      });
    }
  }, [success, error]);

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stripe Settings</h1>
          <p className="text-muted-foreground">Configure your Stripe Connect integration</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/${params.orgSlug}/settings/payment-gateways`}>
            Back to Payment Gateways
          </Link>
        </Button>
      </div>

      {success === 'true' && (
        <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Your Stripe account has been successfully connected. You can now accept payments.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">Connect New Account</h2>
            <p className="text-sm text-muted-foreground">
              Connect a new Stripe account to start accepting payments
            </p>
          </div>
          <StripeSettingsForm orgId={orgId} />
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">Connected Accounts</h2>
            <p className="text-sm text-muted-foreground">
              Manage your connected Stripe accounts
            </p>
          </div>
          <ConnectedAccountsList 
            orgId={orgId} 
            onAccountDeleted={() => {
              toast({
                title: "Success",
                description: "Stripe account has been successfully disconnected.",
              });
            }} 
          />
        </div>
      </div>
    </div>
  );
} 