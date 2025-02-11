'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Upload as UploadIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualPaymentForm } from "@/app/(authenticated)/[orgSlug]/(org-pages)/payments/_components/manual-payment-form";
import { StripePaymentForm } from './stripe-payment-form';
import { toast } from "@/components/ui/use-toast";
import { createStripePaymentIntent } from '../actions';
import { Alert, AlertDescription } from "@/components/ui/alert";

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
}

export function PaymentForm({ 
  order, 
  orgId, 
  defaultMethod = 'manual',
  hasActiveStripeAccount = false 
}: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string>();
  const [selectedMethod, setSelectedMethod] = useState(defaultMethod);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();

  // Calculate if payments are allowed
  const isOrderSettled = order.status === 'completed' || order.status === 'paid';
  const isApplicationSettled = order.application?.status === 'approved' || order.application?.status === 'completed';
  const totalPaid = order.payments
    ?.filter(p => p.status === 'approved' || p.status === 'paid')
    ?.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0;
  const isFullyPaid = totalPaid >= order.amount;
  const canAcceptPayments = !isOrderSettled && !isApplicationSettled && !isFullyPaid;

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
              {(order.amount / 100).toLocaleString(undefined, {
                style: 'currency',
                currency: order.currency
              })}
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

  // If no active Stripe account and card is selected, switch to manual
  useEffect(() => {
    if (!hasActiveStripeAccount && selectedMethod === 'card') {
      setSelectedMethod('manual');
    }
  }, [hasActiveStripeAccount, selectedMethod]);

  const handleStripeSuccess = async () => {
    // Refresh the page to show updated payment status
    window.location.reload();
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

  // Automatically initialize Stripe payment when card method is selected
  useEffect(() => {
    if (selectedMethod === 'card' && !clientSecret && !isCreatingIntent) {
      initializeStripePayment();
    }
  }, [selectedMethod]);

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
            {(order.amount / 100).toLocaleString(undefined, {
              style: 'currency',
              currency: order.currency
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={selectedMethod} onValueChange={setSelectedMethod} className="space-y-6">
          <TabsList className="grid" style={{ gridTemplateColumns: hasActiveStripeAccount ? '1fr 1fr' : '1fr' }}>
            {defaultMethod === 'manual' && (
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <UploadIcon className="h-4 w-4" />
                Manual Payment
              </TabsTrigger>
            )}
            {hasActiveStripeAccount && (
              <TabsTrigger value="card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Pay with Card
              </TabsTrigger>
            )}
          </TabsList>
          
          {defaultMethod === 'manual' && (
            <TabsContent value="manual" className="space-y-4">
              <div className="rounded-lg border bg-card text-card-foreground">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Bank Transfer Instructions</h3>
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    <p>Please follow these steps to complete your payment:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Transfer the exact amount to our bank account</li>
                      <li>Take a screenshot or photo of your payment confirmation</li>
                      <li>Upload the proof of payment below</li>
                      <li>Wait for our team to verify your payment</li>
                    </ol>
                  </div>
                </div>
                <div className="border-t">
                  <div className="p-6">
                    <ManualPaymentForm
                      orderId={order.id}
                      orgId={orgId}
                      expectedAmount={order.amount}
                      currency={order.currency}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
          
          {hasActiveStripeAccount && (
            <TabsContent value="card">
              <div className="rounded-lg border bg-card text-card-foreground p-6">
                <h3 className="text-lg font-semibold mb-2">Secure Card Payment</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Complete your payment securely using your credit or debit card.
                </p>
                
                {paymentError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{paymentError}</AlertDescription>
                  </Alert>
                )}

                {clientSecret ? (
                  <StripePaymentForm
                    clientSecret={clientSecret}
                    amount={order.amount}
                    currency={order.currency}
                    onSuccess={handleStripeSuccess}
                    onError={handleStripeError}
                  />
                ) : (
                  <div className="flex justify-center">
                    {isCreatingIntent ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <span>Preparing payment...</span>
                      </div>
                    ) : (
                      <Button 
                        onClick={initializeStripePayment}
                        disabled={isCreatingIntent}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Retry Card Payment
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
} 