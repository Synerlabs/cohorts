"use client";

import { useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard, Receipt } from 'lucide-react';
import { usePayment } from './payment-context';

interface PaymentFormProps {
  order: any;
  orgId: string;
  userId: string;
  hasActiveStripeAccount?: boolean;
  hasActiveXenditAccount?: boolean;
}

export function PaymentForm({ 
  order,
  orgId,
  userId,
  hasActiveStripeAccount = false,
  hasActiveXenditAccount = false
}: PaymentFormProps) {
  const { 
    selectedMethod, 
    setSelectedMethod, 
    error,
    stripeClientSecret,
    createStripePaymentIntent,
  } = usePayment();

  // Check which payment methods are available
  const hasCardPayment = hasActiveStripeAccount;
  const hasManualPayment = true;

  // If card payment is selected but not available, switch to manual
  useEffect(() => {
    if (selectedMethod === 'stripe' && !hasCardPayment) {
      setSelectedMethod('manual');
    }
  }, [selectedMethod, hasCardPayment, setSelectedMethod]);

  // Create payment intent when Stripe is selected
  useEffect(() => {
    if (selectedMethod === 'stripe' && !stripeClientSecret && hasCardPayment) {
      createStripePaymentIntent(order.id, orgId);
    }
  }, [selectedMethod, stripeClientSecret, hasCardPayment, order.id, orgId, createStripePaymentIntent]);

  return (
    <div className="space-y-6">
      <RadioGroup
        value={selectedMethod}
        onValueChange={(value) => setSelectedMethod(value as 'manual' | 'stripe')}
        className="grid grid-cols-1 gap-4"
      >
        {hasCardPayment && (
          <div>
            <RadioGroupItem
              value="stripe"
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
    </div>
  );
} 