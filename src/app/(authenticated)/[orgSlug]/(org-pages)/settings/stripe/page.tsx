import { withOrgAccess, OrgAccessHOCProps } from '@/lib/hoc/org';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StripeSettingsForm } from './_components/stripe-settings-form';
import { getStripeSettings } from './_actions/stripe-settings';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

async function StripeSettingsPage({ org }: OrgAccessHOCProps) {
  const settings = await getStripeSettings(org.id);

  // Transform null to undefined for the form
  const formSettings = settings ? {
    livePublishableKey: settings.livePublishableKey,
    liveSecretKey: settings.liveSecretKey,
    liveWebhookSecret: settings.liveWebhookSecret,
    testPublishableKey: settings.testPublishableKey,
    testSecretKey: settings.testSecretKey,
    testWebhookSecret: settings.testWebhookSecret,
    isTestMode: settings.isTestMode
  } : undefined;

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Stripe Settings</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Configure your Stripe account settings for accepting payments
        </p>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${settings?.isTestMode ? 'md:grid-cols-1' : 'md:grid-cols-[3fr,2fr]'}`}>
        {/* Left Column - API Keys */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Configure both live and test environment API keys. You can find these in your Stripe Dashboard under Developers &gt; API keys.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StripeSettingsForm 
                orgId={org.id}
                initialSettings={formSettings}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Environment Info */}
        <div className={`space-y-6 ${settings?.isTestMode ? 'max-w-3xl' : ''}`}>
          {settings?.isTestMode && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Test mode is enabled. All payments will be processed in the test environment.
              </AlertDescription>
            </Alert>
          )}

          <Card className="bg-secondary/5">
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Set up webhooks for both environments in your Stripe Dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-1">Live Webhook URL</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Add this URL to your live webhook endpoint in Stripe
                </p>
                <code className="bg-muted px-3 py-2 rounded-md text-sm font-mono break-all">
                  {`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe`}
                </code>
              </div>

              <div>
                <h4 className="font-medium mb-1">Test Webhook URL</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Add this URL to your test webhook endpoint in Stripe
                </p>
                <code className="bg-muted px-3 py-2 rounded-md text-sm font-mono break-all">
                  {`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe/test`}
                </code>
              </div>

              <div>
                <h4 className="font-medium mb-1">Events to Send</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>payment_intent.succeeded</li>
                  <li>payment_intent.payment_failed</li>
                  <li>payment_intent.canceled</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/5">
            <CardHeader>
              <CardTitle>Testing</CardTitle>
              <CardDescription>
                Use these test card numbers to verify your Stripe integration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Test Card Numbers</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex justify-between items-center">
                    <span>Success</span>
                    <code className="bg-muted px-2 py-1 rounded">4242 4242 4242 4242</code>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>Requires Authentication</span>
                    <code className="bg-muted px-2 py-1 rounded">4000 0025 0000 3155</code>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>Declined</span>
                    <code className="bg-muted px-2 py-1 rounded">4000 0000 0000 0002</code>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-1">Test Data</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Expiry: Any future date</li>
                  <li>CVC: Any 3 digits</li>
                  <li>Name: Any name</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default withOrgAccess(StripeSettingsPage); 
