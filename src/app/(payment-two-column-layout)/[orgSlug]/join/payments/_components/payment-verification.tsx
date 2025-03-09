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
  clientSecret: string;
  accountId: string | null;
  orgSlug: string;
  orderId: string;
}

export function PaymentVerification({ clientSecret, accountId, orgSlug, orderId }: PaymentVerificationProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already_paid'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');

  useEffect(() => {
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
        // Get Stripe instance with the correct account
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, 
          accountId ? { stripeAccount: accountId } : undefined
        );
        
        if (!stripe) {
          throw new Error('Failed to load Stripe');
        }

        // Retrieve the payment intent to check its status
        const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (!paymentIntent) {
          throw new Error('No payment intent found');
        }

        // Store the payment ID for reference
        setPaymentId(paymentIntent.id);
        
        // Check the payment status
        switch (paymentIntent.status) {
          case 'succeeded':
            setStatus('success');
            break;
          case 'processing':
            // Poll again in 2 seconds
            setTimeout(checkPaymentStatus, 2000);
            break;
          case 'requires_payment_method':
            setStatus('error');
            setErrorMessage('Your payment was not successful, please try again.');
            break;
          default:
            setStatus('error');
            setErrorMessage(`Unexpected payment status: ${paymentIntent.status}`);
            break;
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      }
    }

    // Start the verification process
    checkOrderStatus();
  }, [clientSecret, accountId, orderId]);

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