"use client";

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PaymentGateway } from '@/types/payment';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { permissions } from '@/lib/types/permissions';
import { GatewayToggle } from './gateway-toggle';
import { ClientComponentPermission } from '@/components/ClientComponentPermission';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { isFeatureEnabled } from '@/lib/features';

const getAvailablePaymentGateways = (): PaymentGateway[] => {
  // Base gateways that are always available
  const baseGateways: PaymentGateway[] = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Accept payments via Stripe Connect',
      icon: 'stripe',
      enabled: false,
    },
    {
      id: 'manual',
      name: 'Manual',
      description: 'Manually mark payments as completed',
      icon: 'wallet',
      enabled: false,
    }
  ];

  // Add Xendit only if the feature flag is enabled
  if (isFeatureEnabled('XENDIT_ENABLED')) {
    baseGateways.push({
      id: 'xendit',
      name: 'Xendit',
      description: 'Accept payments via Xendit with automatic splits',
      icon: 'wallet',
      enabled: false,
    });
  }

  return baseGateways;
};

interface PaymentGatewayRecord {
  id: string;
  gateway_id: string;
  enabled: boolean;
}

interface PaymentGatewaysListProps {
  orgSlug: string;
  userPermissions: string[];
  groupId: string;
  gatewayRecords: PaymentGatewayRecord[];
}

export function PaymentGatewaysList({ 
  orgSlug, 
  userPermissions, 
  groupId,
  gatewayRecords 
}: PaymentGatewaysListProps) {
  const { hasPermission } = usePermissions();
  const [availableGateways, setAvailableGateways] = useState<PaymentGateway[]>([]);
  
  // Use useEffect to initialize the available gateways on the client side
  useEffect(() => {
    setAvailableGateways(getAvailablePaymentGateways());
  }, []);

  return (
    <div className="grid gap-4">
      {availableGateways.map((gateway) => {
        // Find existing record for this gateway
        const record = gatewayRecords.find(r => r.gateway_id === gateway.id);
        
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
                <ClientComponentPermission requiredPermissions={[permissions.paymentGateways.edit]}>
                  <GatewayToggle 
                    gatewayId={gateway.id}
                    id={record?.id}
                    initialEnabled={record?.enabled ?? false}
                    groupId={groupId}
                  />
                </ClientComponentPermission>
                <ClientComponentPermission requiredPermissions={[permissions.paymentGateways.configure]}>
                  <Button 
                    variant="outline" 
                    asChild
                  >
                    <Link href={`/@${orgSlug}/settings/payment-gateways/${gateway.id}`}>
                      Configure
                    </Link>
                  </Button>
                </ClientComponentPermission>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
} 