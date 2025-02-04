'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function ManualSettingsClient({ params }: { params: { orgSlug: string } }) {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manual Payment Settings</h1>
          <p className="text-muted-foreground">Configure manual payment handling</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/${params.orgSlug}/settings/payment-gateways`}>
            Back to Payment Gateways
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-medium mb-4">Manual Payment Instructions</h3>
          <p className="text-muted-foreground mb-4">
            Manual payments allow you to mark payments as completed after receiving them through external means 
            (e.g., bank transfer, cash, check). You can manage these payments through the payments dashboard.
          </p>
          <Button asChild>
            <Link href={`/${params.orgSlug}/payments`}>
              Go to Payments Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 