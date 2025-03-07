'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Upload as UploadIcon, Globe, ChevronsUpDown, Check, AlertCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualPaymentForm } from "@/app/(authenticated)/[orgSlug]/(org-pages)/payments/_components/manual-payment-form";
import { StripePaymentForm } from './stripe-payment-form';
import { XenditPaymentForm } from './xendit-payment-form';
import { useToast } from "@/components/ui/use-toast";
import { createStripePaymentIntent } from '../actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatAmount } from '@/lib/utils/currency';
import { isFeatureEnabled } from '@/lib/features';
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  hasActiveXenditAccount?: boolean;
}

export function PaymentForm({ 
  order, 
  orgId, 
  defaultMethod = 'manual',
  hasActiveStripeAccount = false,
  hasActiveXenditAccount = false
}: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string>();
  const [selectedMethod, setSelectedMethod] = useState(defaultMethod);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState({
    status: order.status,
    totalPaid: 0 // Initialize with 0 to avoid hydration mismatch
  });
  const { toast } = useToast();

  // Pre-format the amount to ensure consistent rendering
  const formattedAmount = formatAmount(order.amount, order.currency);

  // Set initial state after hydration
  useEffect(() => {
    setIsClient(true);
    setPaymentStatus({
      status: order.status,
      totalPaid: order.payments
        ?.filter(p => p.status === 'approved' || p.status === 'paid')
        ?.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0
    });
  }, [order.status, order.payments]);

  // Handle payment method availability based on active accounts and feature flags
  useEffect(() => {
    if (!isClient) return;
    
    // If Stripe is not available but selected, fall back to manual
    if (!hasActiveStripeAccount && selectedMethod === 'stripe') {
      setSelectedMethod('manual');
    }
    
    // If Xendit feature is disabled or Xendit account not available but selected, fall back to manual
    if (
      (selectedMethod === 'xendit') && 
      (!isFeatureEnabled('XENDIT_ENABLED') || !hasActiveXenditAccount)
    ) {
      setSelectedMethod('manual');
    }
  }, [isClient, hasActiveStripeAccount, hasActiveXenditAccount, selectedMethod]);

  // Initialize Stripe when card method is selected
  useEffect(() => {
    if (!isClient) return;
    
    if (selectedMethod === 'stripe' && !clientSecret && hasActiveStripeAccount && !isCreatingIntent) {
      console.log('Creating Stripe payment intent');
      createStripeIntent();
    }
  }, [selectedMethod, clientSecret, isClient, hasActiveStripeAccount]);
  
  // Check if payment is possible
  const canPerformPayment = 
    (order.status === 'pending' || order.status === 'partial') && 
    (!order.application || order.application.status !== 'cancelled');

  // Helper function to get payment message
  function getPaymentMessage() {
    if (order.status === 'completed' || order.status === 'paid') {
      return 'This order has been fully paid.';
    }
    
    if (order.application?.status === 'cancelled') {
      return 'This application has been cancelled. Payment is not accepted.';
    }
    
    return null;
  }

  // Create the Stripe payment intent
  async function createStripeIntent() {
    setIsCreatingIntent(true);
    setPaymentError(undefined);
    
    try {
      const clientSecret = await createStripePaymentIntent(
        order.id,
        order.amount,
        order.currency,
        orgId
      );
      if (clientSecret) {
        setClientSecret(clientSecret);
      } else {
        setPaymentError('Failed to initialize payment. Please try again.');
        console.error('Failed to create payment intent: No client secret returned');
        toast({
          variant: "destructive",
          title: "Payment Error",
          description: "Failed to initialize payment. Please try again."
        });
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment. Please try again.';
      setPaymentError(errorMessage);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: errorMessage
      });
    } finally {
      setIsCreatingIntent(false);
    }
  }

  // Handle successful payment
  function handlePaymentSuccess() {
    setPaymentSuccess(true);
    console.log('Payment successful');
    toast({
      title: "Payment Successful",
      description: "Your payment has been processed successfully.",
    });
    
    // Update payment status
    setPaymentStatus({
      status: 'paid',
      totalPaid: order.amount
    });
    
    // Polling mechanism to check payment status
    let pollCount = 0;
    const maxPolls = 10; // Maximum polling attempts
    
    const checkPaymentStatus = async () => {
      try {
        // After a few seconds of showing the success state, reload the page
        if (pollCount >= maxPolls) {
          window.location.reload();
          return;
        }
        
        pollCount++;
        setTimeout(checkPaymentStatus, 1000);
      } catch (error) {
        console.error('Error checking payment status:', error);
        // Even if there's an error, reload after maximum polls
        if (pollCount >= maxPolls) {
          window.location.reload();
        } else {
          pollCount++;
          setTimeout(checkPaymentStatus, 1000);
        }
      }
    };
    
    // Start checking payment status
    setTimeout(checkPaymentStatus, 1000);
  }

  // Handle payment error
  function handlePaymentError(error: string) {
    console.error('Payment error:', error);
    setPaymentError(error);
    toast({
      variant: "destructive",
      title: "Payment Failed",
      description: error,
    });
  }

  // Get available payment methods
  function getAvailablePaymentMethods() {
    const methods = [];
    
    // Manual payment is always available
    methods.push({
      id: 'manual',
      name: 'Manual / Bank Transfer',
      icon: UploadIcon
    });
    
    // Add Stripe if available
    if (hasActiveStripeAccount) {
      methods.push({
        id: 'stripe',
        name: 'Credit Card (Stripe)',
        icon: CreditCard
      });
    }
    
    // Add Xendit if enabled and available
    if (isFeatureEnabled('XENDIT_ENABLED') && hasActiveXenditAccount) {
      methods.push({
        id: 'xendit',
        name: 'Online Banking (Xendit)',
        icon: Globe
      });
    }
    
    return methods;
  }

  // Render payment method content
  function renderPaymentMethodContent() {
    if (paymentSuccess) {
      return (
        <div className="bg-primary/5 rounded-lg p-8 border border-primary/10">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-emerald-100 p-3">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-medium">Payment Successful!</h3>
            <p className="text-muted-foreground max-w-md">
              Your payment has been processed successfully. The page will refresh shortly to show your updated status.
            </p>
            <div className="h-2 w-full max-w-xs bg-muted rounded-full overflow-hidden mt-4">
              <div className="h-2 bg-emerald-500 animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      );
    }
    
    if (!canPerformPayment) {
      return (
        <Alert className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Status</AlertTitle>
          <AlertDescription>
            {getPaymentMessage()}
          </AlertDescription>
        </Alert>
      );
    }
    
    // Render appropriate payment form based on selected method
    switch (selectedMethod) {
      case 'stripe':
        return (
          <div className="space-y-6 mt-4">
            {isCreatingIntent ? (
              <div className="bg-primary/5 rounded-lg p-8 border border-primary/10">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
                  <p className="text-muted-foreground">Initializing payment...</p>
                </div>
              </div>
            ) : paymentError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Payment Error</AlertTitle>
                <AlertDescription>
                  {paymentError}
                </AlertDescription>
              </Alert>
            ) : clientSecret ? (
              <StripePaymentForm
                clientSecret={clientSecret}
                amount={order.amount}
                currency={order.currency}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            ) : null}
          </div>
        );
        
      case 'xendit':
        return (
          <div className="space-y-6 mt-4">
            <XenditPaymentForm
              orderId={order.id}
              orgId={orgId}
              amount={order.amount}
              currency={order.currency}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </div>
        );
        
      case 'manual':
      default:
        return (
          <div className="space-y-6 mt-6">
            <ManualPaymentForm
              orderId={order.id}
              orgId={orgId}
              expectedAmount={order.amount}
              currency={order.currency}
            />
          </div>
        );
    }
  }

  return (
    <Card className="shadow-md border-muted/80">
      <CardHeader className="border-b px-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Complete Your Payment</CardTitle>
            <CardDescription className="mt-1.5">
              Choose your preferred payment method
            </CardDescription>
          </div>
          <div className="text-2xl font-semibold">
            {formattedAmount}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-6">
        <div className="space-y-6">
          {/* Payment Method Selector */}
          <div className="grid gap-2">
            <Label htmlFor="payment-method" className="text-base font-medium">
              Payment Method
            </Label>
            <Select
              value={selectedMethod}
              onValueChange={setSelectedMethod}
              disabled={isCreatingIntent || paymentSuccess}
            >
              <SelectTrigger id="payment-method" className="h-11">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {getAvailablePaymentMethods().map(method => {
                  const Method = method.icon;
                  return (
                    <SelectItem key={method.id} value={method.id} className="py-2.5">
                      <div className="flex items-center">
                        <Method className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{method.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          {/* Payment Method Cards - Alternative Tab-based UI */}
          <Tabs value={selectedMethod} onValueChange={setSelectedMethod} className="hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual" className="data-[state=active]:bg-primary/10">
                <UploadIcon className="h-4 w-4 mr-2" />
                Manual
              </TabsTrigger>
              <TabsTrigger 
                value="stripe" 
                disabled={!hasActiveStripeAccount} 
                className="data-[state=active]:bg-primary/10"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Card
              </TabsTrigger>
              <TabsTrigger 
                value="xendit" 
                disabled={!isFeatureEnabled('XENDIT_ENABLED') || !hasActiveXenditAccount} 
                className="data-[state=active]:bg-primary/10"
              >
                <Globe className="h-4 w-4 mr-2" />
                Bank
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-2 text-xs text-muted-foreground">PAYMENT DETAILS</span>
            </div>
          </div>
          
          {/* Payment Method Content */}
          {renderPaymentMethodContent()}
        </div>
      </CardContent>
      
      {paymentError && (
        <CardFooter className="bg-destructive/5 px-6 py-4">
          <div className="flex items-start space-x-2 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-destructive">{paymentError}</p>
          </div>
        </CardFooter>
      )}
    </Card>
  );
} 