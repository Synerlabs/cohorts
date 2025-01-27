'use client';

import { useEffect, useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CreditCard } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface StripePaymentFormProps {
  clientSecret: string;
  amount: number;
  currency: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function PaymentForm({ amount, currency, onSuccess, onError }: Omit<StripePaymentFormProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
      });

      if (error) {
        onError(error.message);
        toast({
          variant: 'destructive',
          title: 'Payment failed',
          description: error.message
        });
      } else {
        onSuccess();
        toast({
          title: 'Payment successful',
          description: 'Your payment has been processed successfully.'
        });
      }
    } catch (error) {
      onError('An unexpected error occurred');
      toast({
        variant: 'destructive',
        title: 'Payment failed',
        description: 'An unexpected error occurred while processing your payment.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        size="lg" 
        disabled={!stripe || isLoading}
      >
        <CreditCard className="mr-2 h-4 w-4" />
        Pay {(amount / 100).toLocaleString(undefined, {
          style: 'currency',
          currency: currency
        })}
      </Button>
    </form>
  );
}

export function StripePaymentForm({ clientSecret, ...props }: StripePaymentFormProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (clientSecret) {
      setIsReady(true);
    }
  }, [clientSecret]);

  if (!isReady) {
    return null;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm {...props} />
    </Elements>
  );
} 