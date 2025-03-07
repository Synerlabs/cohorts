'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PaymentSuccessPage({ params }: { params: { orgSlug: string } }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function checkStatus() {
      try {
        const stripe = await stripePromise;
        if (!stripe) throw new Error('Failed to load Stripe');

        const clientSecret = searchParams.get('payment_intent_client_secret');
        if (!clientSecret) throw new Error('No payment intent client secret found');

        const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
        if (!paymentIntent) throw new Error('No payment intent found');

        switch (paymentIntent.status) {
          case 'succeeded':
            setStatus('success');
            break;
          case 'processing':
            // You might want to poll here until the payment is complete
            setStatus('loading');
            break;
          case 'requires_payment_method':
            setStatus('error');
            setErrorMessage('Your payment was not successful, please try again.');
            break;
          default:
            setStatus('error');
            setErrorMessage('Something went wrong.');
            break;
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
      }
    }

    checkStatus();
  }, [searchParams]);

  return (
    <div className="container max-w-5xl py-12">
      <Card className="shadow-md">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="flex flex-col items-center text-center space-y-6">
            {status === 'loading' && (
              <>
                <div className="p-4 bg-primary/10 rounded-full">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold">Processing your payment</h2>
                  <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="p-4 bg-emerald-50 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold">Payment successful!</h2>
                  <p className="text-muted-foreground">Thank you for your payment. Your membership is now being processed.</p>
                </div>
                <Button size="lg" asChild>
                  <Link href={`/@${params.orgSlug}/dashboard`}>
                    Go to Dashboard
                  </Link>
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="p-4 bg-destructive/10 rounded-full">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold">Payment failed</h2>
                  <p className="text-muted-foreground">{errorMessage || 'Something went wrong with your payment.'}</p>
                </div>
                <Button size="lg" variant="outline" asChild>
                  <Link href={`/@${params.orgSlug}/join/payments`}>
                    Try Again
                  </Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 