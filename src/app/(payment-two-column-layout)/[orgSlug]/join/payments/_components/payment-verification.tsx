"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loadStripe } from '@stripe/stripe-js';
import Link from 'next/link';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentVerificationProps {
  clientSecret?: string;
  accountId?: string | null;
  orgSlug: string;
  orderId?: string;
  paymentIntentId?: string;
}

export function PaymentVerification({ clientSecret, accountId, orgSlug, orderId, paymentIntentId }: PaymentVerificationProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already_paid'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');

  useEffect(() => {
    // If we have a paymentIntentId, we'll use that
    if (paymentIntentId) {
      checkPaymentStatus();
    } else if (clientSecret) {
      // We have a client secret, so we'll use that
      checkOrderStatus();
    } else {
      // We don't have either, so we'll show an error
      setStatus('error');
      setErrorMessage('Missing payment information');
    }
    
    async function checkOrderStatus() {
      try {
        // First check if the order still needs payment
        const response = await fetch(`/api/orders/${orderId}/status`);
        const orderData = await response.json();
        
        if (!response.ok) {
          throw new Error(orderData.error || 'Failed to check order status');
        }
        
        // If the order is already paid or completed, no need to verify payment
        if (orderData.status === 'paid' || orderData.status === 'completed') {
          setStatus('already_paid');
          return;
        }
        
        // Proceed with payment verification
        checkPaymentStatus();
      } catch (error) {
        console.error('Error checking order status:', error);
        // If we can't check the order status, continue with payment verification anyway
        checkPaymentStatus();
      }
    }
    
    async function checkPaymentStatus() {
      try {
        // Check payment status using the paymentIntentId
        if (paymentIntentId) {
          setStatus('success');
          setPaymentId(paymentIntentId);
        } else {
          setStatus('error');
          setErrorMessage('Missing payment intent ID');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        setErrorMessage('Failed to retrieve payment status');
      }
    }
  }, [clientSecret, orderId, paymentIntentId]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Payment Verification</CardTitle>
        <CardDescription>
          We're confirming your payment with our payment processor
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-center text-muted-foreground">
              Verifying your payment status...
            </p>
            <p className="text-xs text-center text-muted-foreground">
              This may take a moment. Please don't close this page.
            </p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-center">Payment Successful!</h3>
            <p className="text-center text-muted-foreground">
              Your payment has been processed successfully.
            </p>
            {paymentId && (
              <p className="text-xs text-center text-muted-foreground">
                Payment ID: {paymentId}
              </p>
            )}
          </div>
        )}
        
        {status === 'already_paid' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-blue-100 p-3">
              <AlertCircle className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-center">Already Paid</h3>
            <p className="text-center text-muted-foreground">
              This order has already been paid for. No additional payment is needed.
            </p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-red-100 p-3">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-center">Payment Verification Failed</h3>
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-center">
        {(status === 'success' || status === 'already_paid') && (
          <Link href={`/@${orgSlug}/dashboard`}>
            <Button className="w-full">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
        
        {status === 'error' && (
          <Link href={`/@${orgSlug}/join/payments`}>
            <Button variant="outline">
              Try Again
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
} 