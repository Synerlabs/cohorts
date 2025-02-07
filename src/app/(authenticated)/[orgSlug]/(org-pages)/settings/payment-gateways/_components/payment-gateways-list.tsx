"use client";

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import React from 'react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { PaymentGateway } from '@/types/payment';
import { updateGatewayStatus } from '../_actions/payment-gateway.action';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';

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
}

export function PaymentGatewaysList({ orgSlug }: PaymentGatewaysListProps) {
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>(initialPaymentGateways);
  
  const toggleActions = {
    stripe: useToastActionState(
      async (prevState: any, formData: FormData) => {
        const enabled = formData.get('enabled') === 'true';
        const result = await updateGatewayStatus({
          gatewayId: 'stripe',
          enabled,
          orgSlug,
        });

        if (result.success) {
          setPaymentGateways(prev =>
            prev.map(gateway =>
              gateway.id === 'stripe' ? { ...gateway, enabled } : gateway
            )
          );
        }

        return result;
      },
      null
    ),
    manual: useToastActionState(
      async (prevState: any, formData: FormData) => {
        const enabled = formData.get('enabled') === 'true';
        const result = await updateGatewayStatus({
          gatewayId: 'manual',
          enabled,
          orgSlug,
        });

        if (result.success) {
          setPaymentGateways(prev =>
            prev.map(gateway =>
              gateway.id === 'manual' ? { ...gateway, enabled } : gateway
            )
          );
        }

        return result;
      },
      null
    ),
  };

  const handleSwitchChange = (gatewayId: string, checked: boolean) => {
    const formData = new FormData();
    formData.append('enabled', checked.toString());
    const [_, action] = toggleActions[gatewayId as keyof typeof toggleActions];
    action(formData);
  };

  return (
    <div className="grid gap-4">
      {paymentGateways.map((gateway) => {
        const [_, __, pending] = toggleActions[gateway.id as keyof typeof toggleActions];
        
        return (
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
                <div className="flex items-center gap-2">
                  <Switch
                    id={`${gateway.id}-enabled`}
                    checked={gateway.enabled}
                    onCheckedChange={(checked) => handleSwitchChange(gateway.id, checked)}
                    disabled={pending}
                  />
                  <Label htmlFor={`${gateway.id}-enabled`} className="min-w-[4rem]">
                    {pending ? 'Updating...' : gateway.enabled ? 'Enabled' : 'Disabled'}
                  </Label>
                </div>
                <Button 
                  variant="outline" 
                  asChild
                >
                  <Link href={`/${orgSlug}/settings/payment-gateways/${gateway.id}`}>
                    Configure
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
} 