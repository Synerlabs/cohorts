'use client';

import { StripeSettingsForm } from '../../../stripe/_components/stripe-settings-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Plus } from 'lucide-react';
import { ConnectedAccountsList } from './connected-accounts-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StripeSettingsClientProps {
  params: { orgSlug: string };
  orgId: string;
}

interface ConnectedAccount {
  id: string;
  account_id: string;
  is_active: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  disabled_reason?: string;
}

interface StripeSettingsFormProps {
  orgId: string;
  onSuccess?: () => void;
}

interface ConnectedAccountsListProps {
  orgId: string;
  onAccountDeleted?: () => void;
  onAccountsLoaded?: (accounts: ConnectedAccount[]) => void;
}

export function StripeSettingsClient({ params, orgId }: StripeSettingsClientProps) {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const error = searchParams.get('error');
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [showConnectForm, setShowConnectForm] = useState(false);

  // Fetch connected accounts
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch(`/api/stripe/connect/accounts?orgId=${orgId}`);
        if (!response.ok) throw new Error('Failed to fetch accounts');
        const data = await response.json();
        setAccounts(data);
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load connected accounts.",
        });
      }
    }
    fetchAccounts();
  }, [orgId]);

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

  const hasActiveAccount = accounts.some(account => account.is_active);

  return (
    <div className="container max-w-4xl py-8">
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

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Connected Accounts</h2>
            <p className="text-sm text-muted-foreground">
              Manage your connected Stripe accounts
            </p>
          </div>
          {!hasActiveAccount && !showConnectForm && (
            <Button onClick={() => setShowConnectForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Connect New Account
            </Button>
          )}
        </div>

        {/* Show connect form if no active accounts or if explicitly requested */}
        {(showConnectForm || accounts.length === 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Connect New Account</CardTitle>
              <CardDescription>
                Connect a new Stripe account to start accepting payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StripeSettingsForm 
                orgId={orgId} 
                onSuccess={() => setShowConnectForm(false)}
              />
            </CardContent>
          </Card>
        )}

        <ConnectedAccountsList 
          orgId={orgId} 
          onAccountDeleted={() => {
            toast({
              title: "Success",
              description: "Stripe account has been successfully disconnected.",
            });
            // Show the connect form when an account is deleted
            setShowConnectForm(true);
          }}
          onAccountsLoaded={(loadedAccounts) => {
            setAccounts(loadedAccounts);
            // Hide connect form if we have an active account
            if (loadedAccounts.some(acc => acc.is_active)) {
              setShowConnectForm(false);
            }
          }}
        />
      </div>
    </div>
  );
} 