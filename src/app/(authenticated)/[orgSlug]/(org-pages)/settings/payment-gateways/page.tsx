import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { withOrgAccess } from '@/lib/hoc/org';
import React from 'react';
import Link from 'next/link';

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
  return (
    <div>
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
                    {gateway.icon && Icons[gateway.icon] && React.createElement(Icons[gateway.icon], { className: "h-6 w-6" })}
                  </div>
                  <div>
                    <h3 className="font-medium">{gateway.name}</h3>
                    <p className="text-sm text-muted-foreground">{gateway.description}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  asChild
                >
                  <Link href={`/${params.orgSlug}/settings/payment-gateways/${gateway.id}`}>
                    Configure
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default withOrgAccess(PaymentGatewaysPage, {
  allowGuest: false,
  permissions: ['manage_payment_gateways']
});

