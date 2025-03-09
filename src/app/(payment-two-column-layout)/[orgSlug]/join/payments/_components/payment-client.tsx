'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2, Receipt, Star, Clock, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { PaymentForm } from './payment-form';
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentProvider, usePayment } from './payment-context';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StripeCardForm } from './stripe-card-form';
import { ManualPaymentForm } from './manual-payment-form';
import { PaymentVerification } from './payment-verification';

// Initialize Stripe - will be replaced by account-specific key when needed
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Dynamic stripe initialization based on account
function getStripePromise(accountId: string | null) {
  // If we have an account ID, use it for the stripeAccount parameter
  if (accountId) {
    return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, {
      stripeAccount: accountId
    });
  }
  
  // Fallback to default initialization
  return stripePromise;
}

// Order Summary Button Component
function OrderSummaryButton() {
  const { submitPayment, isSubmitting, paymentStatus, selectedMethod } = usePayment();
  
  return (
    <Button 
      type="button" 
      className="w-full" 
      size="lg"
      onClick={() => submitPayment()}
      disabled={isSubmitting || paymentStatus === 'processing' || paymentStatus === 'success' || paymentStatus === 'verifying'}
    >
      {isSubmitting || paymentStatus === 'processing' ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {selectedMethod === 'manual' ? 'Processing your proof...' : 'Processing payment...'}
        </>
      ) : paymentStatus === 'success' ? (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {selectedMethod === 'manual' ? 'Proof Submitted' : 'Payment Complete'}
        </>
      ) : paymentStatus === 'verifying' ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {selectedMethod === 'stripe' ? 'Preparing verification...' : 'Verifying payment status...'}
        </>
      ) : (
        `Complete Payment`
      )}
    </Button>
  );
}

// Status Messages Component
function PaymentStatusMessages() {
  const { error, paymentStatus, selectedMethod } = usePayment();
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (paymentStatus === 'verifying') {
    return (
      <Alert className="bg-blue-50 text-blue-800 border-blue-200">
        <Loader2 className="h-4 w-4 text-blue-600 mr-2 animate-spin" />
        <AlertDescription>
          {selectedMethod === 'stripe' 
            ? "Payment received. Preparing verification screen..." 
            : "Verifying payment status with our payment processor. This may take a moment..."}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (paymentStatus === 'success') {
    return (
      <Alert className="bg-green-50 text-green-800 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
        <AlertDescription>
          {selectedMethod === 'manual' 
            ? "Payment proof submitted successfully! Your payment is now pending review." 
            : "Payment processed successfully! We'll update your membership status shortly."}
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}

// Main Client Component
export function PaymentClient({ 
  org, 
  user, 
  order, 
  membershipDetails, 
  benefits, 
  gatewaysStatus,
  createStripePaymentIntentFn
}: {
  org: any;
  user: any;
  order: any;
  membershipDetails: any;
  benefits: string[];
  gatewaysStatus: {
    stripe: { enabled: boolean; stripeConnected: boolean };
    manual: { enabled: boolean };
  };
  createStripePaymentIntentFn: (orderId: string, groupId: string) => Promise<{ clientSecret: string; accountId: string }>;
}) {
  // Main component wrapping with payment provider
  return (
    <PaymentProvider 
      defaultMethod={gatewaysStatus.manual.enabled ? 'manual' : 'stripe'}
      createStripePaymentIntentFn={createStripePaymentIntentFn}
      orderId={order.id}
      groupId={org.id}
    >
      <PaymentPageContent 
        org={org} 
        user={user} 
        order={order} 
        membershipDetails={membershipDetails} 
        benefits={benefits} 
        gatewaysStatus={gatewaysStatus}
      />
    </PaymentProvider>
  );
}

// Content Component with conditional Stripe Elements wrapper
function PaymentPageContent({ 
  org, 
  user, 
  order, 
  membershipDetails, 
  benefits, 
  gatewaysStatus 
}: {
  org: any;
  user: any;
  order: any;
  membershipDetails: any;
  benefits: string[];
  gatewaysStatus: {
    stripe: { enabled: boolean; stripeConnected: boolean };
    manual: { enabled: boolean };
  };
}) {
  const { selectedMethod, stripeClientSecret, stripeAccountId, showVerification } = usePayment();
  
  // If we're showing the verification component, render it instead of the regular content
  if (showVerification && stripeClientSecret) {
    return (
      <div className="container max-w-5xl py-12">
        <PaymentVerification 
          clientSecret={stripeClientSecret}
          accountId={stripeAccountId}
          orgSlug={org.slug}
          orderId={order.id}
        />
      </div>
    );
  }
  
  // Determine which payment form to show based on selected method
  const renderPaymentForm = () => {
    if (selectedMethod === 'stripe') {
      // For Stripe, we only render the form if we have a client secret
      // and we're inside the Elements provider
      if (stripeClientSecret) {
        return <StripeCardForm />;
      }
      
      // Show loading state while waiting for client secret
      return (
        <div className="flex justify-center items-center py-8">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
            <p className="text-muted-foreground">Preparing payment form...</p>
          </div>
        </div>
      );
    }
    
    // For manual payment
    if (selectedMethod === 'manual') {
      return (
        <ManualPaymentForm 
          order={order}
          orgId={org.id}
          userId={user.id}
        />
      );
    }
    
    return null;
  };
  
  // Main content without the payment form
  const commonContent = (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column - Customer Information */}
      <div className="lg:col-span-7 space-y-8">
        <div>
          <Link 
            href={`/@${org.slug}/join`}
            className="text-sm inline-flex items-center font-medium text-primary hover:underline"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to membership options
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-2">Complete your membership payment</h1>
          <p className="text-muted-foreground mt-1">Fill in your details to complete your payment</p>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
              <CardDescription>We'll use this information for your membership record</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                  <Input id="fullName" placeholder="Enter your full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
                  <Input id="email" type="email" placeholder="Enter your email address" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="Enter your phone number" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Method</CardTitle>
              <CardDescription>Choose how you'd like to pay</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentStatusMessages />
              <PaymentForm 
                order={order}
                orgId={org.id}
                userId={user.id}
                hasActiveStripeAccount={gatewaysStatus.stripe.enabled && gatewaysStatus.stripe.stripeConnected}
              />
              
              {/* Render the appropriate payment form based on selected method */}
              {renderPaymentForm()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Column - Order Summary */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="bg-slate-50 border-0 shadow-none sticky top-6">
          <CardHeader>
            <CardTitle className="text-xl">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Membership Details */}
            {membershipDetails && (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded bg-slate-100 flex items-center justify-center">
                    <Star className="h-6 w-6 text-primary/70" />
                  </div>
                  <div>
                    <h3 className="font-medium">{membershipDetails.name}</h3>
                    {membershipDetails.interval && (
                      <Badge variant="outline" className="mt-1">
                        {membershipDetails.interval === 'month' ? 'Monthly' : 
                         membershipDetails.interval === 'year' ? 'Annual' : 
                         membershipDetails.interval === 'lifetime' ? 'Lifetime' : 
                         membershipDetails.interval}
                      </Badge>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">{membershipDetails.description}</p>
                  </div>
                </div>
                
                <Separator />
                
                {benefits.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Benefits include:</h4>
                    <ul className="text-sm space-y-1.5">
                      {benefits.slice(0, 3).map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                      {benefits.length > 3 && (
                        <li className="text-primary text-sm font-medium">
                          +{benefits.length - 3} more benefits
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Price Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.amount, order.currency)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Tax</span>
                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency || 'USD' }).format(0)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatCurrency(order.amount, order.currency)}</span>
              </div>
            </div>
            
            {/* Universal Order Summary Button */}
            <OrderSummaryButton />
            
            <div className="flex items-center justify-center text-sm text-muted-foreground gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              <span>Secure checkout - SSL encrypted</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
  
  // If we're using Stripe and have a client secret, wrap everything in Elements
  if (selectedMethod === 'stripe' && stripeClientSecret) {
    // Use the connected account-specific Stripe instance
    const stripeWithAccount = getStripePromise(stripeAccountId);
    
    return (
      <Elements 
        stripe={stripeWithAccount} 
        options={{ 
          clientSecret: stripeClientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#0070f3',
            }
          }
        }}
      >
        {commonContent}
      </Elements>
    );
  }
  
  // Otherwise return the content directly
  return commonContent;
} 