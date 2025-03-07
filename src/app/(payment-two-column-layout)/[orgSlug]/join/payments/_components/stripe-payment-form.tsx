"use client";

import { useEffect, useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CreditCard, Loader2, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { createStripePaymentIntent } from '../actions';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface StripePaymentFormProps {
  order: any;
  orgId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  onProcessing: () => void;
}

function PaymentForm({ order, onSuccess, onError }: Omit<StripePaymentFormProps, 'orgId'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const { toast } = useToast();

  // Check for redirect status on component mount
  useEffect(() => {
    if (!stripe) return;

    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );
    const redirectStatus = new URLSearchParams(window.location.search).get(
      'redirect_status'
    );

    if (clientSecret && redirectStatus === 'succeeded') {
      setIsProcessing(true);
      
      // Wait for a short delay to simulate processing
      const timer = setTimeout(() => {
        onSuccess();
        toast({
          title: 'Payment successful',
          description: 'Your payment has been processed successfully.'
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [stripe, onSuccess, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        onError(error.message || 'Payment failed');
        toast({
          variant: 'destructive',
          title: 'Payment failed',
          description: error.message
        });
      } else {
        // This block won't usually execute as redirect happens
        setIsProcessing(true);
      }
    } catch (error) {
      const message = 'An unexpected error occurred';
      setErrorMessage(message);
      onError(message);
      toast({
        variant: 'destructive',
        title: 'Payment failed',
        description: 'An unexpected error occurred while processing your payment.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="bg-primary/5 rounded-lg p-8 border border-primary/10">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
          <h3 className="text-xl font-medium">Processing Your Payment</h3>
          <p className="text-muted-foreground max-w-md">
            Your payment is being processed. Please wait a moment while we confirm your transaction.
          </p>
          <div className="h-2 w-full max-w-xs bg-muted rounded-full overflow-hidden mt-4">
            <div className="h-2 bg-primary animate-pulse rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border border-muted/60 shadow-sm overflow-hidden">
        <CardContent className="p-5">
          <PaymentElement className="!pt-2" />
        </CardContent>
      </Card>
      
      {errorMessage && (
        <Alert variant="destructive" className="mt-2">
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      <div className="pt-2">
        <Button 
          type="submit" 
          className="w-full h-12 text-base font-medium" 
          size="lg" 
          disabled={!stripe || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay {formatCurrency(order.amount, order.currency)}
            </>
          )}
        </Button>
        
        <div className="flex items-center justify-center mt-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <svg className="h-4 w-4" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 13.414L18.586 0 14 4.586l10 10-10 10L18.586 29 32 15.414l-4.586-4.586z" fill="currentColor"/>
              <path d="M14 4.586L0 18.586 4.586 23.172 18.586 9.172 14 4.586zM14 20.586l4.586 4.586 7.414-7.414L21.414 13.172 14 20.586z" fill="currentColor"/>
            </svg>
            <span>Secured by Stripe</span>
          </div>
        </div>
      </div>
    </form>
  );
}

export function StripePaymentForm(props: StripePaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function createPaymentIntent() {
      try {
        const { clientSecret } = await createStripePaymentIntent(props.order.id, props.orgId);
        if (clientSecret) {
          setClientSecret(clientSecret);
          setIsReady(true);
        } else {
          throw new Error('No client secret returned');
        }
      } catch (error) {
        console.error('Failed to create payment intent:', error);
        props.onError('Failed to initialize payment');
      }
    }

    createPaymentIntent();
  }, [props.order.id, props.orgId]);

  if (!isReady || !clientSecret) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
          <p className="text-muted-foreground">Preparing payment form...</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm {...props} />
    </Elements>
  );
} 