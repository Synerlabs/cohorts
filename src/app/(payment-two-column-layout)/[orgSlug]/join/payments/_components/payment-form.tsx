"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard, Receipt } from 'lucide-react';
import { StripePaymentForm } from './stripe-payment-form';
import { ManualPaymentForm } from './manual-payment-form';
import { XenditPaymentForm } from './xendit-payment-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface PaymentFormProps {
  order: any;
  orgId: string;
  defaultMethod?: string;
  hasActiveStripeAccount?: boolean;
  hasActiveXenditAccount?: boolean;
  hasActiveManualPayments?: boolean;
}

export function PaymentForm({ 
  order,
  orgId,
  defaultMethod = 'card',
  hasActiveStripeAccount = false,
  hasActiveXenditAccount = false,
  hasActiveManualPayments = true
}: PaymentFormProps) {
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [selectedMethod, setSelectedMethod] = useState(defaultMethod);
  const [error, setError] = useState<string | null>(null);

  // Format amount for display
  const amount = order.amount;
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: order.currency || 'USD'
  }).format(amount / 100);

  // Check which payment methods are available
  const hasCardPayment = hasActiveStripeAccount || hasActiveXenditAccount;
  const hasManualPayment = hasActiveManualPayments;

  // If card payment is not available but was selected, switch to manual
  useEffect(() => {
    if (selectedMethod === 'card' && !hasCardPayment) {
      setSelectedMethod('manual');
    }
  }, [selectedMethod, hasCardPayment]);

  // If no payment methods are available, show error
  if (!hasCardPayment && !hasManualPayment) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          No payment methods are currently available. Please contact the organization administrator.
        </AlertDescription>
      </Alert>
    );
  }

  // If payment is successful, show success message
  if (paymentStatus === 'success') {
    return (
      <Alert>
        <AlertDescription className="flex items-center gap-2">
          Payment processed successfully! We'll update your membership status shortly.
        </AlertDescription>
      </Alert>
    );
  }

  // If payment is processing, show processing message
  if (paymentStatus === 'processing') {
    return (
      <Alert>
        <AlertDescription>
          Processing your payment...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <RadioGroup
        defaultValue={selectedMethod}
        value={selectedMethod}
        onValueChange={setSelectedMethod}
        className="grid grid-cols-1 gap-4"
      >
        {hasCardPayment && (
          <div>
            <RadioGroupItem
              value="card"
              id="card"
              className="peer sr-only"
            />
            <Label
              htmlFor="card"
              className="flex flex-col items-start justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary/70" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Credit Card</p>
                    <p className="text-sm text-muted-foreground">
                      Pay securely with your credit card
                    </p>
                  </div>
                </div>
              </div>
            </Label>
          </div>
        )}

        {hasManualPayment && (
          <div>
            <RadioGroupItem
              value="manual"
              id="manual"
              className="peer sr-only"
            />
            <Label
              htmlFor="manual"
              className="flex flex-col items-start justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-primary/70" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Manual Payment</p>
                    <p className="text-sm text-muted-foreground">
                      Upload proof of payment after bank transfer
                    </p>
                  </div>
                </div>
              </div>
            </Label>
          </div>
        )}
      </RadioGroup>

      <Separator />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedMethod === 'card' && hasActiveStripeAccount && (
        <StripePaymentForm
          order={order}
          orgId={orgId}
          onSuccess={() => setPaymentStatus('success')}
          onError={(message: string) => {
            setError(message);
            setPaymentStatus('error');
          }}
          onProcessing={() => setPaymentStatus('processing')}
        />
      )}

      {selectedMethod === 'card' && !hasActiveStripeAccount && hasActiveXenditAccount && (
        <XenditPaymentForm
          order={order}
          orgId={orgId}
          onSuccess={() => setPaymentStatus('success')}
          onError={(message: string) => {
            setError(message);
            setPaymentStatus('error');
          }}
          onProcessing={() => setPaymentStatus('processing')}
        />
      )}

      {selectedMethod === 'manual' && (
        <ManualPaymentForm
          order={order}
          orgId={orgId}
          onError={(message: string) => {
            setError(message);
            setPaymentStatus('error');
          }}
          onProcessing={() => setPaymentStatus('processing')}
        />
      )}
    </div>
  );
} 