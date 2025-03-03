'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Upload as UploadIcon, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualPaymentForm } from "@/app/(authenticated)/[orgSlug]/(org-pages)/payments/_components/manual-payment-form";
import { StripePaymentForm } from './stripe-payment-form';
import { XenditPaymentForm } from './xendit-payment-form';
import { toast } from "@/components/ui/use-toast";
import { createStripePaymentIntent } from '../actions';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatAmount } from '@/lib/utils/currency';
import { isFeatureEnabled } from '@/lib/features';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentFormProps {
  order: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    payments?: any[];
    application?: {
      id: string;
      status: string;
    } | null;
  };
  orgId: string;
  defaultMethod?: string;
  hasActiveStripeAccount?: boolean;
  hasActiveXenditAccount?: boolean;
}

export function PaymentForm({ 
  order, 
  orgId, 
  defaultMethod = 'manual',
  hasActiveStripeAccount = false,
  hasActiveXenditAccount = false
}: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string>();
  const [selectedMethod, setSelectedMethod] = useState(defaultMethod);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState({
    status: order.status,
    totalPaid: 0 // Initialize with 0 to avoid hydration mismatch
  });

  // Pre-format the amount to ensure consistent rendering
  const formattedAmount = formatAmount(order.amount, order.currency);

  // Set initial state after hydration
  useEffect(() => {
    setIsClient(true);
    setPaymentStatus({
      status: order.status,
      totalPaid: order.payments
        ?.filter(p => p.status === 'approved' || p.status === 'paid')
        ?.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0
    });
  }, [order.status, order.payments]);

  // Handle payment method availability based on active accounts and feature flags
  useEffect(() => {
    if (!isClient) return;
    
    // If Stripe is not available but selected, fall back to manual
    if (!hasActiveStripeAccount && selectedMethod === 'stripe') {
      setSelectedMethod('manual');
    }
    
    // If Xendit feature is disabled or Xendit account not available but selected, fall back to manual
    if (
      (selectedMethod === 'xendit') && 
      (!isFeatureEnabled('XENDIT_ENABLED') || !hasActiveXenditAccount)
    ) {
      setSelectedMethod('manual');
    }
  }, [isClient, hasActiveStripeAccount, hasActiveXenditAccount, selectedMethod]);

  // Initialize Stripe payment when card method is selected
  useEffect(() => {
    if (selectedMethod === 'stripe' && !clientSecret && !isCreatingIntent) {
      initializeStripePayment();
    }
  }, [selectedMethod, clientSecret, isCreatingIntent]);

  // Check URL params for payment success (only on client)
  useEffect(() => {
    if (!isClient) return;

    const searchParams = new URLSearchParams(window.location.search);
    // Check both our custom success parameter and Stripe's redirect parameters
    const isSuccess = 
      searchParams.get('payment_status') === 'success' || 
      searchParams.get('redirect_status') === 'succeeded' ||
      searchParams.get('payment_intent_client_secret') !== null;

    if (isSuccess) {
      setPaymentSuccess(true);

      // Only start polling if payment is not already completed
      if (order.status !== 'paid' && order.status !== 'completed') {
        let pollCount = 0;
        const maxPolls = 20; // Maximum number of polling attempts (1 minute)
        let pollInterval: ReturnType<typeof setTimeout>;
        
        const checkPaymentStatus = async () => {
          try {
            const response = await fetch(`/api/payments/${order.id}/status`);
            const data = await response.json();
            
            setPaymentStatus({
              status: data.status,
              totalPaid: data.totalPaid
            });

            // Stop polling if payment is complete or we've reached max attempts
            if (data.status === 'paid' || data.status === 'completed' || !data.hasPendingPayment) {
              // Only reload if the status has actually changed
              if (data.status !== order.status) {
                window.location.reload();
              }
            } else if (pollCount < maxPolls) {
              pollCount++;
              pollInterval = setTimeout(checkPaymentStatus, 3000);
            } else {
              // After max attempts, show a message but don't refresh
              toast({
                title: "Payment Status Update",
                description: "The payment is still being processed. You can refresh the page to check the latest status.",
                duration: 10000,
              });
            }
          } catch (error) {
            console.error('Error checking payment status:', error);
            if (pollCount < maxPolls) {
              pollCount++;
              pollInterval = setTimeout(checkPaymentStatus, 3000);
            }
          }
        };

        // Start checking payment status
        pollInterval = setTimeout(checkPaymentStatus, 3000);

        // Cleanup interval on unmount
        return () => {
          if (pollInterval) {
            clearTimeout(pollInterval);
          }
        };
      }
    }
  }, [isClient, order.id, order.status]);

  // Calculate if payments are allowed
  const isOrderSettled = paymentStatus.status === 'completed' || paymentStatus.status === 'paid';
  const isApplicationSettled = order.application?.status === 'approved' || order.application?.status === 'completed';
  const isFullyPaid = paymentStatus.totalPaid >= order.amount;
  const canAcceptPayments = !isOrderSettled && !isApplicationSettled && !isFullyPaid && !paymentSuccess;

  // If we haven't hydrated yet, show a loading state or the initial server state
  if (!isClient) {
    return (
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Loading Payment Status</CardTitle>
              <CardDescription className="mt-1.5">Please wait...</CardDescription>
            </div>
            <div className="text-2xl font-semibold">
              {formattedAmount}
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // If payment was successful but still processing
  if (paymentSuccess) {
    const showProcessingMessage = order.status !== 'paid' && order.status !== 'completed';
    
    return (
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {showProcessingMessage ? 'Payment Processing' : 'Payment Complete'}
              </CardTitle>
              <CardDescription className="mt-1.5">
                {showProcessingMessage ? 'Your payment is being processed' : 'Your payment has been processed successfully'}
              </CardDescription>
            </div>
            <div className="text-2xl font-semibold">
              {formattedAmount}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <div className="flex items-center gap-2">
                {showProcessingMessage ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    <AlertDescription className="text-green-800">
                      Payment successful! Please wait while we process your payment. This may take a few moments.
                    </AlertDescription>
                  </>
                ) : (
                  <AlertDescription className="text-green-800">
                    Your payment has been processed successfully.
                  </AlertDescription>
                )}
              </div>
            </Alert>
            {showProcessingMessage && (
              <div className="text-sm text-muted-foreground">
                <p>Your payment has been confirmed and is being processed. The page will automatically update to show your payment status.</p>
                <p className="mt-2">If the status doesn't update after a few minutes, you can safely refresh the page.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // If payments are not allowed, show appropriate message
  if (!canAcceptPayments) {
    return (
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Status</CardTitle>
              <CardDescription className="mt-1.5">
                {isFullyPaid ? 'Payment completed' : 'Payment not required'}
              </CardDescription>
            </div>
            <div className="text-2xl font-semibold">
              {formattedAmount}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>
              {isFullyPaid 
                ? 'This order has been fully paid.' 
                : isOrderSettled 
                  ? 'This order has already been completed.'
                  : 'This application has already been processed.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handleStripeSuccess = async () => {
    // Set success state
    setPaymentSuccess(true);
    
    // Add success parameter to URL
    const url = new URL(window.location.href);
    url.searchParams.set('payment_status', 'success');
    window.history.replaceState({}, '', url.toString());
  };

  const handleStripeError = (error: string) => {
    setPaymentError(error);
    toast({
      variant: 'destructive',
      title: 'Payment failed',
      description: error
    });
  };

  const initializeStripePayment = async () => {
    setIsCreatingIntent(true);
    setPaymentError(undefined);
    
    try {
      const secret = await createStripePaymentIntent(
        order.id,
        order.amount,
        order.currency,
        orgId
      );
      if (secret) {
        setClientSecret(secret);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create payment intent. Please try again.';
      setPaymentError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setIsCreatingIntent(false);
    }
  };

  // Add this function to determine available payment methods for the select dropdown
  const getAvailablePaymentMethods = () => {
    const methods = [
      { id: 'manual', name: 'Manual Payment' },
    ];
    
    if (hasActiveStripeAccount) {
      methods.push({ id: 'stripe', name: 'Card Payment' });
    }
    
    // Only show Xendit if the feature flag is enabled AND there's an active account
    if (isFeatureEnabled('XENDIT_ENABLED') && hasActiveXenditAccount) {
      methods.push({ id: 'xendit', name: 'Xendit Payment' });
    }
    
    return methods;
  };
  
  // Use this where the TabsContent for Xendit is rendered
  const renderXenditTabContent = () => {
    if (!isFeatureEnabled('XENDIT_ENABLED') || !hasActiveXenditAccount) {
      return null;
    }
    
    return (
      <TabsContent value="xendit">
        <XenditPaymentForm
          orderId={order.id}
          orgId={orgId}
          amount={order.amount}
          currency={order.currency}
          onSuccess={handleStripeSuccess}
          onError={handleStripeError}
        />
      </TabsContent>
    );
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription className="mt-1.5">
              Choose your preferred payment method
            </CardDescription>
          </div>
          <div className="text-2xl font-semibold">
            {formattedAmount}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select
              value={selectedMethod}
              onValueChange={setSelectedMethod}
              disabled={isCreatingIntent || paymentSuccess}
            >
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {getAvailablePaymentMethods().map(method => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Tabs value={selectedMethod} onValueChange={setSelectedMethod} className="space-y-6">
          <TabsList className={`grid grid-cols-${getAvailablePaymentMethods().length} mb-6`}>
            <TabsTrigger value="manual">
              <UploadIcon size={16} className="mr-2" />
              Manual
            </TabsTrigger>
            
            {hasActiveStripeAccount && (
              <TabsTrigger 
                value="stripe"
                onClick={() => {
                  if (!clientSecret && !isCreatingIntent) {
                    initializeStripePayment();
                  }
                }}
                disabled={isCreatingIntent || paymentSuccess}
              >
                <CreditCard size={16} className="mr-2" />
                Card
              </TabsTrigger>
            )}
            
            {isFeatureEnabled('XENDIT_ENABLED') && hasActiveXenditAccount && (
              <TabsTrigger 
                value="xendit"
                disabled={isCreatingIntent || paymentSuccess}
              >
                <Globe size={16} className="mr-2" />
                Xendit
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="manual">
            <ManualPaymentForm
              orderId={order.id}
              orgId={orgId}
              expectedAmount={order.amount}
              currency={order.currency}
            />
          </TabsContent>
          
          <TabsContent value="stripe">
            {clientSecret ? (
              <StripePaymentForm
                clientSecret={clientSecret}
                amount={order.amount}
                currency={order.currency}
                onSuccess={handleStripeSuccess}
                onError={handleStripeError}
              />
            ) : (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </TabsContent>

          {renderXenditTabContent()}
        </Tabs>
      </CardContent>
    </Card>
  );
} 