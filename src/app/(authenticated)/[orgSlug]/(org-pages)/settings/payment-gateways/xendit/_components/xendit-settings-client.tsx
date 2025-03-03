"use client";

import { useState, useEffect } from 'react';
import { XenditSettings } from '@/app/(authenticated)/[orgSlug]/(org-pages)/settings/payments/_components/xendit-settings';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage 
} from '@/components/ui/breadcrumb';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface XenditSettingsClientProps {
  params: { orgSlug: string };
  orgId: string;
}

export function XenditSettingsClient({ params, orgId }: XenditSettingsClientProps) {
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [accountStatus, setAccountStatus] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, [orgId]);

  async function fetchSettings() {
    setLoading(true);
    try {
      // Get gateway record
      const { data: gatewayRecord, error: gatewayError } = await supabase
        .from('group_payment_gateways')
        .select('*')
        .eq('group_id', orgId)
        .eq('gateway_id', 'xendit')
        .single();

      if (gatewayError) throw gatewayError;
      
      setEnabled(gatewayRecord?.enabled || false);

      // Check if Xendit account is connected
      const { data: xenditAccount, error: xenditError } = await supabase
        .from('xendit_connected_accounts')
        .select('*')
        .eq('org_id', orgId)
        .maybeSingle();

      if (xenditError) throw xenditError;
      
      setIsConnected(!!xenditAccount);

      if (xenditAccount) {
        setAccountStatus({
          isActive: xenditAccount.is_active,
          chargesEnabled: xenditAccount.charges_enabled,
          payoutsEnabled: xenditAccount.payouts_enabled,
          hasExternalAccount: xenditAccount.has_external_account,
          requirementsDueDate: xenditAccount.requirements_due_date,
          disabledReason: xenditAccount.disabled_reason
        });
      }
    } catch (error) {
      console.error('Error fetching Xendit settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error fetching settings',
        description: 'There was a problem fetching Xendit settings.'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleEnabled(newEnabled: boolean) {
    try {
      const { error } = await supabase
        .from('group_payment_gateways')
        .update({ enabled: newEnabled })
        .eq('group_id', orgId)
        .eq('gateway_id', 'xendit');

      if (error) throw error;

      setEnabled(newEnabled);
      toast({
        title: `Xendit payments ${newEnabled ? 'enabled' : 'disabled'}`,
        description: `You have successfully ${newEnabled ? 'enabled' : 'disabled'} Xendit payments.`
      });
    } catch (error) {
      console.error('Error toggling Xendit gateway:', error);
      toast({
        variant: 'destructive',
        title: 'Settings not saved',
        description: 'There was a problem saving your settings.'
      });
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/@${params.orgSlug}/settings`}>Settings</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/@${params.orgSlug}/settings/payment-gateways`}>Payment Gateways</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Xendit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Xendit Settings</h1>
        <p className="text-muted-foreground">
          Configure your Xendit account for accepting payments with automatic revenue splits.
        </p>
        
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <XenditSettings
            orgId={orgId}
            enabled={enabled}
            isConnected={isConnected}
            accountStatus={accountStatus}
            onToggle={handleToggleEnabled}
          />
        )}
      </div>
    </div>
  );
} 