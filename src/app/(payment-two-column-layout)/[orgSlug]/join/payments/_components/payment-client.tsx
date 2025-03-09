'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2, Receipt, Star, Clock, Lock, Loader2, CheckCircle, CreditCard, FileText } from "lucide-react";
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
  
  // Get text based on payment method
  const getButtonText = () => {
    if (isSubmitting || paymentStatus === 'processing') {
      return selectedMethod === 'manual' 
        ? 'Uploading Proof...' 
        : 'Processing Payment...';
    }
    
    if (paymentStatus === 'success') {
      return selectedMethod === 'manual' 
        ? 'Proof Submitted' 
        : 'Payment Complete';
    }
    
    if (paymentStatus === 'verifying') {
      return selectedMethod === 'stripe' 
        ? 'Verifying Payment...' 
        : 'Verifying Status...';
    }
    
    // Default button text based on payment method
    return selectedMethod === 'manual' 
      ? 'Submit Payment Proof' 
      : selectedMethod === 'stripe'
        ? 'Pay Now'
        : 'Complete Payment';
  };
  
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
          {selectedMethod === 'manual' ? 'Uploading Proof...' : 'Processing Payment...'}
        </>
      ) : paymentStatus === 'success' ? (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {selectedMethod === 'manual' ? 'Proof Submitted' : 'Payment Complete'}
        </>
      ) : paymentStatus === 'verifying' ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {selectedMethod === 'stripe' ? 'Verifying Payment...' : 'Verifying Status...'}
        </>
      ) : (
        <>
          {selectedMethod === 'stripe' && <CreditCard className="mr-2 h-4 w-4" />}
          {selectedMethod === 'manual' && <FileText className="mr-2 h-4 w-4" />}
          {getButtonText()}
        </>
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
  
  // Only show success message for manual payments if we're not showing the dedicated notification
  if (paymentStatus === 'success') {
    // For manual payments, we now handle this in renderPaymentForm() with a dedicated notification
    if (selectedMethod === 'manual') {
      return null; // Don't show anything here, the dedicated notification will handle it
    }
    
    // For Stripe and other payment methods, show the standard success message
    return (
      <Alert className="bg-green-50 text-green-800 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
        <AlertDescription>
          Payment processed successfully! We'll update your membership status shortly.
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}

// Helper component to display existing payments with improved UI
function ExistingPaymentsDisplay({ payments }: { payments: any[] }) {
  // Filter out initialized Stripe payments - these are not fully completed payments
  const filteredPayments = payments.filter(payment => 
    !(payment.type === 'stripe' && payment.status === 'initialized')
  );
  
  if (!filteredPayments || filteredPayments.length === 0) {
    return null;
  }

  // Format the payment amount (handle both number and string types)
  const formatAmount = (amount: any, currency: string = 'USD') => {
    // Convert to number if it's a string
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Handle null or undefined
    if (numericAmount === null || numericAmount === undefined) {
      return 'N/A';
    }
    
    // Check if it's already in cents or needs to be converted
    const inCents = numericAmount > 100; // Assume amounts over 100 are in cents
    const normalizedAmount = inCents ? numericAmount / 100 : numericAmount;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(normalizedAmount);
  };

  // Function to get status icon based on payment status
  const getStatusIcon = (status: string, type: string) => {
    const paymentTypeIcon = () => {
      switch (type) {
        case 'manual':
          return <FileText className="h-4 w-4 mr-2 text-slate-400" />;
        case 'stripe':
          return <CreditCard className="h-4 w-4 mr-2 text-slate-400" />;
        default:
          return <Receipt className="h-4 w-4 mr-2 text-slate-400" />;
      }
    };
    
    switch (status) {
      case 'completed':
      case 'success':
      case 'paid':
        return (
          <div className="flex items-center">
            {paymentTypeIcon()}
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        );
      case 'pending':
      case 'pending_approval':
      case 'initialized':
        return (
          <div className="flex items-center">
            {paymentTypeIcon()}
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
        );
      case 'failed':
      case 'rejected':
        return (
          <div className="flex items-center">
            {paymentTypeIcon()}
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        );
      default:
        return (
          <div className="flex items-center">
            {paymentTypeIcon()}
            <Clock className="h-5 w-5 text-slate-500" />
          </div>
        );
    }
  };

  // Function to get status badge based on payment status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Awaiting Approval</Badge>;
      case 'initialized':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Initializing</Badge>;
      case 'failed':
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format payment type
  const formatPaymentType = (type: string) => {
    switch (type) {
      case 'manual':
        return 'Bank Transfer';
      case 'stripe':
        return 'Credit Card';
      case 'xendit':
        return 'Online Payment';
      default:
        return 'Payment';
    }
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center">
        <h3 className="text-base font-semibold">Payment History</h3>
        <div className="ml-2 px-2 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
          {filteredPayments.length} {filteredPayments.length === 1 ? 'payment' : 'payments'}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        {filteredPayments.map((payment, index) => (
          <div key={payment.id} className={`p-4 ${index !== filteredPayments.length - 1 ? 'border-b border-slate-200' : ''} hover:bg-slate-50 transition-colors`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getStatusIcon(payment.status, payment.type)}</div>
                <div>
                  <div className="font-medium text-sm">
                    {formatPaymentType(payment.type)}
                    {payment.reference && 
                      <span className="ml-2 text-xs text-slate-500">
                        Ref: {payment.reference}
                      </span>
                    }
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                    <span className="whitespace-nowrap">{formatDate(payment.created_at)}</span>
                    <span className="font-medium text-slate-700 whitespace-nowrap">
                      {formatAmount(payment.amount, payment.currency)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-1 sm:mt-0">
                {getStatusBadge(payment.status)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
  const { selectedMethod, stripeClientSecret, stripeAccountId, showVerification, paymentStatus } = usePayment();
  const [orderStatus, setOrderStatus] = useState<{
    isPaid: boolean;
    status: string;
    payments: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  const [hasSubmittedPayment, setHasSubmittedPayment] = useState(false);
  const [showPaymentSelection, setShowPaymentSelection] = useState(true);

  // Fetch order status when component mounts and when paymentStatus changes
  useEffect(() => {
    // When payment status becomes 'success', hide the payment selection
    if (paymentStatus === 'success') {
      setShowPaymentSelection(false);
    }
    
    async function checkOrderStatus() {
      try {
        console.log('Checking order status for order ID:', order.id);
        const response = await fetch(`/api/orders/${order.id}/status`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch order status. Status: ${response.status}, Response:`, errorText);
          throw new Error(`Failed to fetch order status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Order status data received:', data);
        
        // Validate payments array
        if (!data.payments) {
          console.warn('No payments array in response');
          data.payments = [];
        }
        
        // Filter out initialized Stripe payments
        const relevantPayments = data.payments.filter(
          (p: any) => !(p.type === 'stripe' && p.status === 'initialized')
        );
        
        // Only include relevant payments for the order status
        data.payments = relevantPayments;
        
        setOrderStatus(data);
        
        // Check if there are any pending payments (excluding initialized Stripe payments)
        const pendingPayments = relevantPayments.filter(
          (p: any) => p.status === 'pending' || p.status === 'pending_approval'
        );
        
        const pendingCount = pendingPayments?.length || 0;
        console.log('Pending payments:', pendingCount);
        setHasPendingPayment(pendingCount > 0);
        
        // Check if there's a payment in pending_approval status or if user has already made a submission
        const hasPaymentInReview = relevantPayments.some(
          (p: any) => p.status === 'pending_approval'
        );
        
        console.log('Has payment in review:', hasPaymentInReview);
        const newHasSubmittedPayment = hasPaymentInReview || paymentStatus === 'success';
        setHasSubmittedPayment(newHasSubmittedPayment);
        
        // Hide payment selection when a payment is submitted
        if (newHasSubmittedPayment && !hasSubmittedPayment) {
          setShowPaymentSelection(false);
        }
      } catch (error) {
        console.error('Error checking order status:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkOrderStatus();
    
    // Set up polling to refresh payment status every 10 seconds
    const pollingInterval = setInterval(() => {
      checkOrderStatus();
    }, 10000);
    
    // Clean up interval on unmount
    return () => {
      clearInterval(pollingInterval);
    };
  }, [order.id, paymentStatus, hasSubmittedPayment]);
  
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
    // If order is already paid, don't show any payment forms
    if (orderStatus?.isPaid) {
      return (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 mb-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-green-800">Payment Completed</h3>
              <p className="text-green-700 mt-2 max-w-md">
                This order has already been paid. Your membership is now active.
              </p>
            </div>
            <div className="pt-2">
              <Link href={`/@${org.slug}/dashboard`}>
                <Button variant="default">Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // If a manual payment has been submitted and is in review,
    // OR if the payment status is success for manual payments
    // BUT the user hasn't clicked "Add Another Payment"
    if (selectedMethod === 'manual' && 
        ((hasSubmittedPayment && !showPaymentSelection) || 
         (paymentStatus === 'success' && !showPaymentSelection))) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 mb-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="rounded-full bg-amber-100 p-3">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-amber-800">Payment Proof Submitted</h3>
              <p className="text-amber-700 mt-2 max-w-md">
                Your payment proof has been submitted and is awaiting approval by an administrator.
                This typically takes 1-2 business days.
              </p>
              <div className="mt-3">
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                  Pending Approval
                </Badge>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Regular form rendering for stripe or manual payment
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
    
    // For manual payment - show form if the user has clicked "Add Another Payment"
    // even if they have previously submitted a payment
    if (selectedMethod === 'manual' && 
        (showPaymentSelection || 
         (!hasSubmittedPayment && paymentStatus !== 'success'))) {
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
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-lg">Payment Method</CardTitle>
              <CardDescription>Choose how you'd like to pay</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <PaymentStatusMessages />
              
              {/* Only show payment history if payments exist */}
              {isLoading ? (
                <div className="py-6 flex justify-center">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">Loading payment information...</p>
                  </div>
                </div>
              ) : orderStatus?.payments && orderStatus.payments.length > 0 ? (
                <div className="mb-6">
                  <ExistingPaymentsDisplay payments={orderStatus.payments} />
                </div>
              ) : null}
              
              {/* Warning about pending payments */}
              {hasPendingPayment && !hasSubmittedPayment && (
                <Alert className="bg-amber-50 text-amber-800 border-amber-200 mb-6">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div className="space-y-1">
                      <h4 className="font-medium">Pending Payment Detected</h4>
                      <AlertDescription className="text-amber-700">
                        You have pending payments that are being processed. You can still submit a new payment if needed.
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}
              
              {/* Show button to add more payments if one has been submitted but the order isn't paid */}
              {hasSubmittedPayment && !orderStatus?.isPaid && !showPaymentSelection && (
                <div className="flex justify-center my-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPaymentSelection(true)}
                    className="flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Add Another Payment
                  </Button>
                </div>
              )}
              
              {/* Only show payment method selection if:
                  1. Order is not already paid AND
                  2. (User hasn't submitted a payment OR showPaymentSelection is true) */}
              {!orderStatus?.isPaid && (showPaymentSelection || !hasSubmittedPayment) && (
                <>
                  <div className="mb-6">
                    <h3 className="text-base font-medium mb-3">Select Payment Method</h3>
                    <PaymentForm 
                      order={order}
                      orgId={org.id}
                      userId={user.id}
                      hasActiveStripeAccount={gatewaysStatus.stripe.enabled && gatewaysStatus.stripe.stripeConnected}
                    />
                  </div>
                </>
              )}
              
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
            
            {/* Payment Button - Don't show for manual payments after successful submission */}
            {!(selectedMethod === 'manual' && paymentStatus === 'success') && (
              <div className="pt-2">
                <OrderSummaryButton />
              </div>
            )}
            
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