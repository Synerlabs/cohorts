'use client';

import { useEffect, useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { usePayment } from './payment-context';

// Define the BillingDetails interface to match the state in payment-client.tsx
interface BillingDetails {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface StripeCardFormProps {
  billingDetails: BillingDetails;
}

export function StripeCardForm({ billingDetails }: StripeCardFormProps) {
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
  return <StripeCardFormContent billingDetails={billingDetails} />;
}

// Separate component that uses hooks after mounting
interface StripeCardFormContentProps {
  billingDetails: BillingDetails;
}

function StripeCardFormContent({ billingDetails }: StripeCardFormContentProps) {
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
            payment_method_data: {
              billing_details: {
                name: billingDetails?.fullName || '',
                email: billingDetails?.email || '',
                phone: billingDetails?.phone || '',
                address: {
                  city: billingDetails?.city || '',
                  country: billingDetails?.country || 'US',
                  line1: billingDetails?.address || '',
                  line2: '',
                  postal_code: billingDetails?.zipCode || '',
                  state: billingDetails?.state || '',
                }
              }
            }
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
  }, [stripe, elements, registerStripeSubmitHandler, billingDetails]);
  
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
    <Card className="border border-muted shadow-sm overflow-hidden">
      <CardContent className="p-6">
        <div className="space-y-4">
          <h3 className="text-base font-medium">Payment Information</h3>
          <div className="text-sm text-muted-foreground mb-4">
            Enter your card details to complete the payment securely.
          </div>
          <PaymentElement options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false
            },
            fields: {
              billingDetails: 'never'
            }
          }} />
          <div className="text-xs text-muted-foreground mt-4 flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Your payment information is securely processed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 