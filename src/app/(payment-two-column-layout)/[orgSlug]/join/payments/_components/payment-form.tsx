"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard, Receipt, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { StripePaymentForm } from './stripe-payment-form';
import { ManualPaymentForm } from './manual-payment-form';
import { XenditPaymentForm } from './xendit-payment-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface PaymentFormProps {
  order: any;
  orgId: string;
  userId: string;
  defaultMethod?: string;
  hasActiveStripeAccount?: boolean;
  hasActiveXenditAccount?: boolean;
  hasActiveManualPayments?: boolean;
}

// Helper component to display existing payments
function ExistingPaymentsDisplay({ payments }: { payments: any[] }) {
  if (!payments || payments.length === 0) {
    return null;
  }

  // Function to get status icon based on payment status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'failed':
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  // Function to get status badge based on payment status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Awaiting Approval</Badge>;
      case 'failed':
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-3 mb-6">
      <h3 className="text-sm font-medium">Payment History</h3>
      <div className="bg-slate-50 rounded-lg border border-slate-100">
        {payments.map((payment, index) => (
          <div key={payment.id} className={`p-4 flex items-center justify-between ${index !== payments.length - 1 ? 'border-b border-slate-100' : ''}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getStatusIcon(payment.status)}</div>
              <div>
                <div className="font-medium text-sm">
                  {payment.type === 'manual' ? 'Manual Payment' : 
                   payment.type === 'stripe' ? 'Credit Card Payment' : 
                   payment.type === 'xendit' ? 'Online Payment' : 
                   'Payment'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(payment.created_at)} • {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: payment.currency || 'USD'
                  }).format(payment.amount / 100)}
                </div>
              </div>
            </div>
            <div>
              {getStatusBadge(payment.status)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PaymentForm({ 
  order,
  orgId,
  userId,
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

  // Check if the order has existing payments
  const existingPayments = order.payments || [];
  const hasPendingPayment = existingPayments.some((p: { status: string }) => p.status === 'pending' || p.status === 'pending_approval');

  return (
    <div className="space-y-6">
      {/* Display existing payments if any */}
      {existingPayments.length > 0 && (
        <ExistingPaymentsDisplay payments={existingPayments} />
      )}

      {/* Warning about pending payments */}
      {hasPendingPayment && (
        <Alert className="bg-amber-50 text-amber-800 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            You have pending payments that are being processed. You can still submit a new payment if needed.
          </AlertDescription>
        </Alert>
      )}

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
          userId={userId}
          onError={(message: string) => {
            setError(message);
            setPaymentStatus('error');
          }}
          onProcessing={() => setPaymentStatus('processing')}
          onSuccess={() => setPaymentStatus('success')}
        />
      )}
    </div>
  );
} 