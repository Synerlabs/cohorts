import { withOrgAccess, OrgAccessHOCProps } from '@/lib/hoc/org';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StripeSettingsForm } from './_components/stripe-settings-form';
import { getConnectedAccounts } from './_actions/stripe-settings';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, XCircle, Clock, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

async function StripeSettingsPage({ org }: OrgAccessHOCProps) {
  const connectedAccounts = await getConnectedAccounts(org.id);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ready to accept payments';
      case 'pending':
        return 'Onboarding in progress';
      case 'disconnected':
        return 'Account disconnected';
      default:
        return '';
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tight">Stripe Connect</h1>
        </div>
        <p className="text-muted-foreground">
          Connect Stripe accounts to accept payments in different countries. You can have multiple accounts for different regions and test/live modes.
        </p>
      </div>

      <div className="space-y-8">
        {/* Connected Accounts List */}
        {connectedAccounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Connected Accounts
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({connectedAccounts.length} account{connectedAccounts.length !== 1 ? 's' : ''})
                </span>
              </CardTitle>
              <CardDescription>
                Manage your organization&apos;s connected Stripe accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {connectedAccounts.map(account => (
                  <div key={account.id} className="py-6 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          {account.country}
                          {account.isTestMode && (
                            <span className="text-amber-500 text-sm px-2 py-1 bg-amber-50 rounded-md">Test Mode</span>
                          )}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-sm text-muted-foreground font-mono bg-secondary/30 px-2 py-0.5 rounded">
                            {account.accountId}
                          </code>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(account.accountStatus || '')}
                            <span className={cn(
                              "text-sm font-medium",
                              account.accountStatus === 'active' && "text-green-600",
                              account.accountStatus === 'pending' && "text-amber-600",
                              account.accountStatus === 'disconnected' && "text-red-600"
                            )}>
                              {getStatusText(account.accountStatus || '')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <StripeSettingsForm 
                      orgId={org.id}
                      initialSettings={account}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* New Account Form */}
        <Card>
          <CardHeader>
            <CardTitle>Connect New Account</CardTitle>
            <CardDescription>
              Add a new Stripe Connect account for a different country or mode. You can have multiple accounts to handle different regions and test/live environments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StripeSettingsForm orgId={org.id} />
          </CardContent>
        </Card>

        {/* Webhook Info */}
        <Card className="bg-secondary/5">
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
            <CardDescription>
              Set up webhooks in your Stripe Dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-1">Webhook URL</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Add this URL to your webhook endpoint in Stripe
              </p>
              <code className="bg-muted px-3 py-2 rounded-md text-sm font-mono break-all">
                {`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe`}
              </code>
            </div>

            <div>
              <h4 className="font-medium mb-1">Events to Send</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>account.updated</li>
                <li>account.application.deauthorized</li>
                <li>payment_intent.succeeded</li>
                <li>payment_intent.payment_failed</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withOrgAccess(StripeSettingsPage); 
