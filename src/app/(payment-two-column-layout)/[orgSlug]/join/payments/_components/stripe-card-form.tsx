'use client';

import { useEffect, useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { usePayment } from './payment-context';

export function StripeCardForm() {
  // Only try to access stripe and elements when component is mounted
  const [isMounted, setIsMounted] = useState(false);
  const { registerStripeSubmitHandler } = usePayment();
  
  // Set mounted state when component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // If not mounted yet, render a placeholder to avoid SSR issues
  if (!isMounted) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
          <p className="text-muted-foreground">Loading payment form...</p>
        </div>
      </div>
    );
  }
  
  // Now that we're mounted on the client, we can use the hooks safely
  return <StripeCardFormContent />;
}

// Separate component that uses hooks after mounting
function StripeCardFormContent() {
  const stripe = useStripe();
  const elements = useElements();
  const [isReady, setIsReady] = useState(false);
  const { registerStripeSubmitHandler } = usePayment();
  
  // Register submit handler with the parent context
  useEffect(() => {
    if (!stripe || !elements) return;
    
    registerStripeSubmitHandler(async () => {
      if (!stripe || !elements) return false;
      
      try {
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: window.location.href,
          },
          redirect: 'if_required'
        });
        
        if (error) {
          console.error('Payment confirmation error:', error);
          throw new Error(error.message || 'Payment failed');
        }
        
        return true;
      } catch (err) {
        console.error('Stripe submission error:', err);
        throw err;
      }
    });
  }, [stripe, elements, registerStripeSubmitHandler]);
  
  // Mark component as ready when Stripe is loaded
  useEffect(() => {
    if (stripe && elements) {
      setIsReady(true);
    }
  }, [stripe, elements]);
  
  // If not yet ready, show loading state
  if (!isReady || !stripe || !elements) {
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
    <Card className="border border-muted/60 shadow-sm overflow-hidden">
      <CardContent className="p-5">
        <PaymentElement className="!pt-2" />
      </CardContent>
    </Card>
  );
} 