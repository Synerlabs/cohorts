'use client';

import { StripeSettingsForm } from '../../../stripe/_components/stripe-settings-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface StripeSettingsClientProps {
  params: { orgSlug: string };
  orgId: string;
}

export function StripeSettingsClient({ params, orgId }: StripeSettingsClientProps) {
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

      <div className="space-y-6">
        <StripeSettingsForm orgId={orgId} />
      </div>
    </div>
  );
} 