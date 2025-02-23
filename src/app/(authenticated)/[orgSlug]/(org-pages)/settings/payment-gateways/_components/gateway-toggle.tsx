"use client";

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { updateGatewayStatus } from '../_actions/payment-gateway.action';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';
import { useState, useEffect } from 'react';

interface GatewayToggleProps {
  gatewayId: string;  // This is the reference ID like 'stripe' or 'manual'
  id?: string;        // This is the database record ID
  initialEnabled: boolean;
  groupId: string;
}

export function GatewayToggle({ gatewayId, id, initialEnabled, groupId }: GatewayToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  
  const [state, dispatch, isPending] = useToastActionState(updateGatewayStatus);

  useEffect(() => {
    if (state?.success) {
      setEnabled(state.data.enabled);
    }
  }, [state]);

  const handleChange = (checked: boolean) => {
    const formData = new FormData();
    if (id) {
      formData.append('id', id);
    } else {
      formData.append('gateway_id', gatewayId);
    }
    formData.append('enabled', String(checked));
    formData.append('groupId', groupId);
    dispatch(formData);
  };

  return (
    <div className="flex items-center gap-2">
      <Switch
        id={`${gatewayId}-enabled`}
        checked={enabled}
        onCheckedChange={handleChange}
        disabled={isPending}
      />
      <Label htmlFor={`${gatewayId}-enabled`} className="min-w-[4rem]">
        {isPending ? 'Updating...' : enabled ? 'Enabled' : 'Disabled'}
      </Label>
    </div>
  );
} 