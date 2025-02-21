"use client";

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { updateGatewayStatus } from '../_actions/payment-gateway.action';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';
import { useState, useEffect } from 'react';

interface GatewayToggleProps {
  gatewayId: string;
  initialEnabled: boolean;
}

export function GatewayToggle({ gatewayId, initialEnabled }: GatewayToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  
  const [state, dispatch, isPending] = useToastActionState(updateGatewayStatus);

  useEffect(() => {
    if (state?.success) {
      setEnabled(state.data.enabled);
    }
  }, [state]);

  const handleChange = (checked: boolean) => {
    const formData = new FormData();
    formData.append('id', gatewayId);
    formData.append('enabled', String(checked));
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