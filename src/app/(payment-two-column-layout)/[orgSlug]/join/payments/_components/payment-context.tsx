'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type PaymentMethod = 'manual' | 'stripe' | 'xendit';

interface PaymentContextType {
  selectedMethod: PaymentMethod;
  setSelectedMethod: (method: PaymentMethod) => void;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  paymentStatus: 'idle' | 'processing' | 'success' | 'verifying' | 'error';
  setPaymentStatus: (status: 'idle' | 'processing' | 'success' | 'verifying' | 'error') => void;
  stripeClientSecret: string | null;
  setStripeClientSecret: (secret: string | null) => void;
  stripeAccountId: string | null;
  setStripeAccountId: (accountId: string | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
  showVerification: boolean;
  setShowVerification: (show: boolean) => void;
  createStripePaymentIntent: (orderId: string, groupId: string) => Promise<void>;
  submitPayment: () => Promise<void>;
  registerStripeSubmitHandler: (handler: () => Promise<boolean>) => void;
  registerManualSubmitHandler: (handler: () => Promise<boolean>) => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}

interface PaymentProviderProps {
  children: ReactNode;
  defaultMethod?: PaymentMethod;
  createStripePaymentIntentFn: (orderId: string, groupId: string) => Promise<{ clientSecret: string; accountId: string }>;
  orderId: string;
  groupId: string;
}

export function PaymentProvider({
  children,
  defaultMethod = 'manual',
  createStripePaymentIntentFn,
  orderId,
  groupId
}: PaymentProviderProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(defaultMethod);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'verifying' | 'error'>('idle');
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Refs for payment submit handlers
  const stripeSubmitRef = React.useRef<() => Promise<boolean>>(() => Promise.resolve(false));
  const manualSubmitRef = React.useRef<() => Promise<boolean>>(() => Promise.resolve(false));

  // Register submit handlers
  const registerStripeSubmitHandler = (handler: () => Promise<boolean>) => {
    stripeSubmitRef.current = handler;
  };
  
  const registerManualSubmitHandler = (handler: () => Promise<boolean>) => {
    manualSubmitRef.current = handler;
  };

  // Create Stripe payment intent
  const createStripePaymentIntent = async (orderId: string, groupId: string) => {
    try {
      setError(null);
      const result = await createStripePaymentIntentFn(orderId, groupId);
      setStripeClientSecret(result.clientSecret);
      setStripeAccountId(result.accountId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment intent');
    }
  };

  // Submit payment based on selected method
  const submitPayment = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      let success = false;
      
      if (selectedMethod === 'stripe') {
        setPaymentStatus('processing');
        success = await stripeSubmitRef.current();
      } else if (selectedMethod === 'manual') {
        setPaymentStatus('processing');
        success = await manualSubmitRef.current();
      }
      
      if (success) {
        // Set success state
        setPaymentStatus('success');
        
        if (selectedMethod === 'stripe') {
          // For Stripe payments, show verifying state and the verification component
          setPaymentStatus('verifying');
          
          // Show the verification component after a short delay
          setTimeout(() => {
            setShowVerification(true);
          }, 1500);
        }
        // For manual payments, we stay on the current page with success state
      }
    } catch (err) {
      setPaymentStatus('error');
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const value = {
    selectedMethod,
    setSelectedMethod,
    isSubmitting,
    setIsSubmitting,
    paymentStatus,
    setPaymentStatus,
    stripeClientSecret,
    setStripeClientSecret,
    stripeAccountId,
    setStripeAccountId,
    error,
    setError,
    showVerification,
    setShowVerification,
    createStripePaymentIntent,
    submitPayment,
    registerStripeSubmitHandler,
    registerManualSubmitHandler
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
} 