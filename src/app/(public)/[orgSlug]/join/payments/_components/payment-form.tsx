'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Upload as UploadIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualPaymentForm } from "@/app/(authenticated)/[orgSlug]/(org-pages)/payments/_components/manual-payment-form";
import { StripePaymentForm } from './stripe-payment-form';
import { toast } from "@/components/ui/use-toast";
import { createStripePaymentIntent } from '../actions';

interface PaymentFormProps {
  order: {
    id: string;
    amount: number;
    currency: string;
    payments?: any[];
  };
  orgId: string;
  defaultMethod?: string;
}

export function PaymentForm({ order, orgId, defaultMethod = 'manual' }: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string>();

  const handleStripeSuccess = async () => {
    // Refresh the page to show updated payment status
    window.location.reload();
  };

  const handleStripeError = (error: string) => {
    toast({
      variant: 'destructive',
      title: 'Payment failed',
      description: error
    });
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
            {(order.amount / 100).toLocaleString(undefined, {
              style: 'currency',
              currency: order.currency
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue={defaultMethod} className="space-y-6">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <UploadIcon className="h-4 w-4" />
              Manual Payment
            </TabsTrigger>
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pay with Card
            </TabsTrigger>
          </TabsList>
          
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
          
          <TabsContent value="card">
            <div className="rounded-lg border bg-card text-card-foreground p-6">
              <h3 className="text-lg font-semibold mb-2">Secure Card Payment</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Complete your payment securely using your credit or debit card.
              </p>
              {clientSecret ? (
                <StripePaymentForm
                  clientSecret={clientSecret}
                  amount={order.amount}
                  currency={order.currency}
                  onSuccess={handleStripeSuccess}
                  onError={handleStripeError}
                />
              ) : (
                <Button 
                  className="w-full" 
                  size="lg"
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    const secret = await createStripePaymentIntent(
                      order.id,
                      order.amount,
                      order.currency,
                      orgId
                    );
                    if (secret) {
                      setClientSecret(secret);
                    } else {
                      toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: 'Failed to create payment intent. Please try again.'
                      });
                    }
                  }}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay with Card
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 