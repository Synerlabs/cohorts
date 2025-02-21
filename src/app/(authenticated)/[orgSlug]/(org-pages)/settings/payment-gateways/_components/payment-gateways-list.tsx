"use client";

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import React from 'react';
import Link from 'next/link';
import { PaymentGateway } from '@/types/payment';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { permissions } from '@/lib/types/permissions';
import { GatewayToggle } from './gateway-toggle';

const initialPaymentGateways: PaymentGateway[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments via Stripe Connect',
    icon: 'stripe',
    enabled: true,
  },
  {
    id: 'manual',
    name: 'Manual',
    description: 'Manually mark payments as completed',
    icon: 'wallet',
    enabled: true,
  }
];

interface PaymentGatewaysListProps {
  orgSlug: string;
  userPermissions: string[];
}

export function PaymentGatewaysList({ orgSlug, userPermissions }: PaymentGatewaysListProps) {
  const { hasPermission } = usePermissions(userPermissions);
  const canEdit = hasPermission(permissions.paymentGateways.edit);
  const canConfigure = hasPermission(permissions.paymentGateways.configure);

  return (
    <div className="grid gap-4">
      {initialPaymentGateways.map((gateway) => (
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
            <div className="flex items-center gap-4">
              {canEdit && (
                <GatewayToggle 
                  gatewayId={gateway.id}
                  initialEnabled={gateway.enabled}
                />
              )}
              {canConfigure && (
                <Button 
                  variant="outline" 
                  asChild
                >
                  <Link href={`/@${orgSlug}/settings/payment-gateways/${gateway.id}`}>
                    Configure
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
} 