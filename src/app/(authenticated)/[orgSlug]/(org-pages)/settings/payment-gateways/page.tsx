'use client';

import { withOrgAuth } from '@/lib/auth/with-org-auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useState } from 'react';
import { StripeSettingsForm } from '../stripe/_components/stripe-settings-form';

interface PaymentGateway {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Icons;
  isConfigured?: boolean;
}

const paymentGateways: PaymentGateway[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments via Stripe Connect',
    icon: 'stripe',
  },
  {
    id: 'manual',
    name: 'Manual',
    description: 'Manually mark payments as completed',
    icon: 'wallet',
  }
];

function PaymentGatewaysPage({ params }: { params: { orgSlug: string } }) {
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);

  function renderGatewaySettings(gateway: PaymentGateway) {
    switch (gateway.id) {
      case 'stripe':
        return <StripeSettingsForm orgId={params.orgSlug} />;
      case 'manual':
        return <div>Manual payment settings</div>;
      default:
        return null;
    }
  }

  return (
    <>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Payment Gateways</h1>
          <p className="text-muted-foreground">Configure payment methods for your organization</p>
        </div>

        <div className="grid gap-4">
          {paymentGateways.map((gateway) => (
            <Card key={gateway.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-secondary/20 p-2">
                    {Icons[gateway.icon] && <Icons[gateway.icon] className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-medium">{gateway.name}</h3>
                    <p className="text-sm text-muted-foreground">{gateway.description}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedGateway(gateway)}
                >
                  Configure
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Sheet 
        open={selectedGateway !== null}
        onOpenChange={(open) => !open && setSelectedGateway(null)}
      >
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {selectedGateway?.name} Settings
            </SheetTitle>
          </SheetHeader>
          {selectedGateway && renderGatewaySettings(selectedGateway)}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default withOrgAuth(PaymentGatewaysPage); 
