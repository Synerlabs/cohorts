'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2, Receipt, Star, Clock, Lock, Loader2, CheckCircle, CreditCard, FileText, Upload, Globe, ChevronsUpDown, Pencil, Info } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StripeCardForm } from './stripe-card-form';
import { ManualPaymentForm } from './manual-payment-form';
import { PaymentVerification } from './payment-verification';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SavedBillingDetails } from './saved-billing-details';
import { 
  BillingDetailsFormData, 
  getAllBillingDetailsForUser, 
  getBillingDetailsForOrder, 
  saveBillingDetails, 
  convertToFormData, 
  getDefaultBillingDetails,
  fixDefaultBillingDetails
} from '@/lib/services/billing-details.service';
import { BillingDetails } from '@/types/database.types';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from "@/components/ui/use-toast";

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
  const { selectedMethod, stripeClientSecret, submitPayment, isSubmitting, setIsSubmitting } = usePayment();
  const [loading, setLoading] = useState(false);
  
  // Use the global submission state to determine if we're loading
  const isLoading = loading || isSubmitting;
  
  const getButtonText = () => {
    if (isLoading) {
      return selectedMethod === 'manual' ? 'Uploading...' : 'Processing...';
    }
    
    if (selectedMethod === 'stripe') {
      return 'Pay with Card';
    }
    
    if (selectedMethod === 'manual') {
      return 'Submit Payment Proof';
    }
    
    return 'Complete Payment';
  };
  
  // Handle payment submission for both payment methods
  const handleClick = async () => {
    if (!selectedMethod) return;
    
    setLoading(true);
    try {
      // For both Stripe and manual, use the submitPayment function
      const result = await submitPayment();
      console.log('Payment submission result:', result);
    } catch (error) {
      console.error('Payment submission error:', error);
    } finally {
      // Delay resetting local loading state to ensure UI feedback
      setTimeout(() => setLoading(false), 1500);
    }
  };
  
  return (
    <Button 
      className="w-full" 
      type="button"
      disabled={isLoading || !selectedMethod}
      onClick={handleClick}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {getButtonText()}
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
  const { selectedMethod, stripeClientSecret, stripeAccountId, showVerification, paymentStatus, setSelectedMethod, createStripePaymentIntent, submitPayment, isSubmitting, setIsSubmitting } = usePayment();
  const [orderStatus, setOrderStatus] = useState<{
    isPaid: boolean;
    status: string;
    payments: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  const [hasSubmittedPayment, setHasSubmittedPayment] = useState(false);
  const [showPaymentSelection, setShowPaymentSelection] = useState(true);
  const [loadingStripe, setLoadingStripe] = useState(false);
  
  // Define a type for the billing details state
  interface BillingDetailsState {
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

  // Update the state definition
  const [billingDetails, setBillingDetails] = useState<BillingDetailsState>({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [billingCompleted, setBillingCompleted] = useState(false);
  
  // Add state for saved billing details
  const [savedBillingDetails, setSavedBillingDetails] = useState<BillingDetails[]>([]);
  const [isLoadingBillingDetails, setIsLoadingBillingDetails] = useState(true);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  
  // Add state for default billing details usage
  const [usingDefaultBillingDetails, setUsingDefaultBillingDetails] = useState(false);
  
  // Add state for fixing default billing details
  const [isFixingDefaults, setIsFixingDefaults] = useState(false);
  
  // Fetch existing billing details on component mount
  useEffect(() => {
    async function fetchBillingDetails() {
      if (!user?.id) return;
      
      setIsLoadingBillingDetails(true);
      try {
        // First check if there are billing details for this order
        const orderBillingDetails = await getBillingDetailsForOrder(order.id);
        
        if (orderBillingDetails) {
          // We found billing details for this order
          console.log('Found existing billing details for order:', orderBillingDetails);
          setBillingDetails(convertToFormData(orderBillingDetails));
          setBillingCompleted(true);  // Skip the form
        } else {
          // Check for default billing details
          const defaultBillingDetails = await getDefaultBillingDetails(user.id);
          
          if (defaultBillingDetails) {
            // We found default billing details - use them and auto-advance
            console.log('Found default billing details, using them:', defaultBillingDetails);
            setBillingDetails(convertToFormData(defaultBillingDetails));
            setUsingDefaultBillingDetails(true);
            setSaveAsDefault(true);
            setBillingCompleted(true); // Skip the form when default details exist
            
            // Get all saved billing details for the user
            const allUserBillingDetails = await getAllBillingDetailsForUser(user.id);
            setSavedBillingDetails(allUserBillingDetails || []);
          } else {
            console.log('No default billing details found, checking for any saved billing details');
            // No default billing details, just get all saved billing details
            const allUserBillingDetails = await getAllBillingDetailsForUser(user.id);
            setSavedBillingDetails(allUserBillingDetails || []);
            
            // If we have any billing details, use the most recent one and auto-advance
            if (allUserBillingDetails && allUserBillingDetails.length > 0) {
              // Sort by updated_at descending (most recent first)
              const sortedDetails = [...allUserBillingDetails].sort(
                (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              );
              
              console.log('Using most recent billing detail:', sortedDetails[0]);
              setBillingDetails(convertToFormData(sortedDetails[0]));
              setBillingCompleted(true); // Skip the form when we have saved details
            } else {
              // Pre-fill form with user data if available
              if (!billingDetails.fullName && user.full_name) {
                handleBillingFieldChange('fullName', user.full_name);
              }
              if (!billingDetails.email && user.email) {
                handleBillingFieldChange('email', user.email);
              }
              console.log('No saved billing details found, using basic user info');
              // Don't set billingCompleted = true here - we need user to complete the form
            }
          }
        }
      } catch (error) {
        console.error('Error fetching billing details:', error);
      } finally {
        setIsLoadingBillingDetails(false);
      }
    }
    
    fetchBillingDetails();
  }, [order.id, user?.id]);  // Only re-run when order or user ID changes
  
  // Updated handleBillingSubmit to save billing details
  const handleBillingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    if (!validateBillingFields()) {
      return; // Don't proceed if there are validation errors
    }
    
    try {
      // Save billing details to database
      const formData: BillingDetailsFormData = {
        fullName: billingDetails.fullName,
        email: billingDetails.email,
        phone: billingDetails.phone,
        company: billingDetails.company,
        address: billingDetails.address,
        city: billingDetails.city,
        state: billingDetails.state,
        zipCode: billingDetails.zipCode,
        country: billingDetails.country
      };
      
      await saveBillingDetails({
        formData,
        userId: user.id,
        orderId: order.id,
        saveAsDefault
      });
      
      // Proceed to payment
      setBillingCompleted(true);
    } catch (error) {
      console.error('Error submitting billing details:', error);
      // Show error to user
    }
  };
  
  // Handle selection of saved billing details
  const handleSelectBillingDetail = (formData: BillingDetailsFormData, isDefault: boolean) => {
    console.log('Selected billing detail, isDefault:', isDefault);
    setBillingDetails(formData);
    // Set the saveAsDefault checkbox based on whether this is a default billing detail
    setSaveAsDefault(isDefault);
    // Auto-advance when selecting a saved billing detail
    setBillingCompleted(true);
  };
  
  // Handle deletion of a saved billing detail
  const handleDeleteBillingDetail = (id: string) => {
    setSavedBillingDetails(savedBillingDetails.filter(detail => detail.id !== id));
  };
  
  // Handle setting a billing detail as default
  const handleSetDefaultBillingDetail = (id: string) => {
    setSavedBillingDetails(savedBillingDetails.map(detail => ({
      ...detail,
      is_default: detail.id === id
    })));
  };
  
  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Validate phone format (basic validation)
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Phone is optional
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
  };
  
  // Handle billing field change
  const handleBillingFieldChange = (field: string, value: string) => {
    setBillingDetails(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  
  // Validate all billing fields
  const validateBillingFields = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Required fields
    if (!billingDetails.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    
    if (!billingDetails.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!validateEmail(billingDetails.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (billingDetails.phone && !validatePhone(billingDetails.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    // Update error state
    setFieldErrors(errors);
    
    // Form is valid if there are no errors
    return Object.keys(errors).length === 0;
  };
  
  // Create Stripe intent when Stripe is selected
  useEffect(() => {
    if (selectedMethod === 'stripe' && !stripeClientSecret && billingCompleted) {
      const initializeStripe = async () => {
        try {
          setLoadingStripe(true);
          console.log('Checking for existing payment intents');
          
          // Check if there's an existing intent in the API route directly
          await createStripePaymentIntent(order.id, org.id);
        } catch (error) {
          console.error('Failed to initialize Stripe:', error);
        } finally {
          setLoadingStripe(false);
        }
      };
      
      initializeStripe();
    }
  }, [selectedMethod, stripeClientSecret, billingCompleted, createStripePaymentIntent, order.id, org.id]);
  
  // Fetch order status when component mounts and when paymentStatus changes
  useEffect(() => {
    // When payment status becomes 'success', hide the payment selection and set submittedPayment
    if (paymentStatus === 'success') {
      setShowPaymentSelection(false);
      setHasSubmittedPayment(true);
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
  
  // Handle payment method selection
  const handleMethodSelect = (method: 'stripe' | 'manual') => {
    setSelectedMethod(method);
  };
  
  // Go back to billing details
  const goBack = () => {
    setBillingCompleted(false);
  };

  // Add handler for fixing default billing details
  const handleFixDefaultBillingDetails = async () => {
    if (!user?.id) return;
    
    setIsFixingDefaults(true);
    try {
      const fixedDefault = await fixDefaultBillingDetails(user.id);
      if (fixedDefault) {
        // Update the saved billing details list
        setSavedBillingDetails(prevDetails => {
          return prevDetails.map(detail => ({
            ...detail,
            is_default: detail.id === fixedDefault.id
          }));
        });
        
        // Use the fixed default
        setBillingDetails(convertToFormData(fixedDefault));
        setUsingDefaultBillingDetails(true);
        setSaveAsDefault(true);
        
        toast({
          title: "Default billing details fixed",
          description: "We've set your most recent billing details as the default.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error fixing default billing details:', error);
      toast({
        title: "Error fixing default billing details",
        description: "Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsFixingDefaults(false);
    }
  };

  // Render the payment form based on selected method
  const renderPaymentForm = () => {
    // Return empty if no method is selected
    if (!selectedMethod) {
      return null;
    }

    // Stripe Form with client secret available
    if (selectedMethod === 'stripe') {
      if (stripeClientSecret) {
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
            <StripeCardForm />
          </Elements>
        );
      } else if (loadingStripe) {
        // Show loading state while waiting for Stripe to initialize
        return (
          <div className="py-6 flex justify-center">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Preparing payment form...</p>
            </div>
          </div>
        );
      }
      
      // Error state if Stripe fails to initialize
      return (
        <Alert className="bg-red-50 text-red-800 border-red-200 mt-4">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>
            There was an error initializing the payment form. Please try again or contact support.
          </AlertDescription>
        </Alert>
      );
    }
    
    // Manual Payment Form
    if (selectedMethod === 'manual') {
      return <ManualPaymentForm order={order} orgId={org.id} userId={user.id} />;
    }
    
    // Default - empty form
    return null;
  };

  // Render the payment success message
  const renderPaymentSuccessMessage = () => {
    if (selectedMethod === 'manual' && paymentStatus === 'success' && !showPaymentSelection) {
      return (
        <div className="p-6 bg-green-50 rounded-lg border border-green-100">
          <div className="flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-green-800">Payment Proof Submitted</h3>
            <p className="text-green-700 mt-1 max-w-md">
              Your payment proof has been submitted successfully. We'll review it shortly and update your membership status.
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

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
  
  // Main content without the payment form
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column - Customer Information */}
      <div className="lg:col-span-7 space-y-6">
        <div>
          <Link 
            href={`/@${org.slug}/join`}
            className="text-sm inline-flex items-center font-medium text-primary hover:underline hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to membership options
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-3 mb-1">Complete your membership</h1>
          <p className="text-muted-foreground">Secure payment for {membershipDetails.name}</p>
        </div>
        
        <div className="space-y-6">
          {/* Billing Information */}
          {!billingCompleted ? (
            <div className="rounded-lg overflow-hidden border shadow-sm">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-5 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">Billing Details</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Used for payment verification and receipts</p>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs bg-white/80 px-2 py-1 rounded-full border">
                    <Lock className="h-3 w-3" />
                    <span>Secure form</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white">
                {/* Payment methods preview - Moved to the top */}
                <div className="mb-6 pb-5 border-b">
                  <div className="mb-3 flex items-center">
                    <h4 className="text-sm font-medium">Available Payment Methods</h4>
                    <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded-full text-xs text-muted-foreground">
                      Choose after completing this form
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {gatewaysStatus.stripe.enabled && gatewaysStatus.stripe.stripeConnected && (
                      <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-slate-200 shadow-sm">
                        <div className="bg-primary/5 p-1.5 rounded-md">
                          <CreditCard className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">Credit Card</span>
                      </div>
                    )}
                    {gatewaysStatus.manual.enabled && (
                      <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-slate-200 shadow-sm">
                        <div className="bg-primary/5 p-1.5 rounded-md">
                          <Receipt className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">Bank Transfer</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Add saved billing details section */}
                {savedBillingDetails && savedBillingDetails.length > 0 && (
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium text-gray-700">Your saved billing details</h3>
                      {!usingDefaultBillingDetails && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={handleFixDefaultBillingDetails}
                          disabled={isFixingDefaults}
                          className="h-8 text-xs"
                        >
                          {isFixingDefaults ? (
                            <>
                              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                              Fixing...
                            </>
                          ) : (
                            <>
                              <Star className="mr-1.5 h-3 w-3" />
                              Set Default
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <SavedBillingDetails 
                      savedDetails={savedBillingDetails}
                      userId={user.id}
                      onSelect={(formData, isDefault) => handleSelectBillingDetail(formData, isDefault)}
                      onDelete={handleDeleteBillingDetail}
                      onSetDefault={handleSetDefaultBillingDetail}
                    />
                  </div>
                )}
                
                {usingDefaultBillingDetails && (
                  <div className="mb-4 px-4 py-3 bg-gray-50 text-gray-800 rounded-md border border-gray-200 flex items-start gap-2">
                    <Info className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Using your saved billing details</p>
                      <p className="text-xs mt-1">We've pre-filled the form with your saved billing details. You can make changes if needed or continue to payment.</p>
                      <p className="text-xs mt-2 italic">Note: To keep these as your default, leave the "Save as default" checkbox checked below.</p>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleBillingSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name - Required */}
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="font-medium">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="fullName" 
                        placeholder="Enter your full name" 
                        value={billingDetails.fullName}
                        onChange={(e) => handleBillingFieldChange('fullName', e.target.value)}
                        className={fieldErrors.fullName ? "border-destructive ring-destructive/10 ring-1" : ""}
                        required
                      />
                      {fieldErrors.fullName && (
                        <p className="text-destructive text-sm flex items-center mt-1">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {fieldErrors.fullName}
                        </p>
                      )}
                    </div>
                    
                    {/* Email - Required */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="font-medium">
                        Email Address <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="Enter your email address" 
                        value={billingDetails.email}
                        onChange={(e) => handleBillingFieldChange('email', e.target.value)}
                        className={fieldErrors.email ? "border-destructive ring-destructive/10 ring-1" : ""}
                        required
                      />
                      {fieldErrors.email && (
                        <p className="text-destructive text-sm flex items-center mt-1">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>
                    
                    {/* Phone - Optional */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="font-medium">
                        Phone Number <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                      </Label>
                      <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="Enter your phone number" 
                        value={billingDetails.phone}
                        onChange={(e) => handleBillingFieldChange('phone', e.target.value)}
                        className={fieldErrors.phone ? "border-destructive ring-destructive/10 ring-1" : ""}
                      />
                      {fieldErrors.phone && (
                        <p className="text-destructive text-sm flex items-center mt-1">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {fieldErrors.phone}
                        </p>
                      )}
                    </div>
                    
                    {/* Company - Optional */}
                    <div className="space-y-2">
                      <Label htmlFor="company" className="font-medium">
                        Company <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                      </Label>
                      <Input 
                        id="company" 
                        placeholder="Enter your company name" 
                        value={billingDetails.company}
                        onChange={(e) => handleBillingFieldChange('company', e.target.value)}
                      />
                    </div>
                    
                    {/* Address - Optional - Full Width */}
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address" className="font-medium">
                        Street Address <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                      </Label>
                      <Input 
                        id="address" 
                        placeholder="Enter your street address" 
                        value={billingDetails.address}
                        onChange={(e) => handleBillingFieldChange('address', e.target.value)}
                      />
                    </div>
                    
                    {/* City - Optional */}
                    <div className="space-y-2">
                      <Label htmlFor="city" className="font-medium">
                        City <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                      </Label>
                      <Input 
                        id="city" 
                        placeholder="Enter your city" 
                        value={billingDetails.city}
                        onChange={(e) => handleBillingFieldChange('city', e.target.value)}
                      />
                    </div>
                    
                    {/* Country - Optional */}
                    <div className="space-y-2">
                      <Label htmlFor="country" className="font-medium">
                        Country <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                      </Label>
                      <Select
                        value={billingDetails.country}
                        onValueChange={(value) => handleBillingFieldChange('country', value)}
                      >
                        <SelectTrigger id="country" className="w-full">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="UK">United Kingdom</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                          <SelectItem value="JP">Japan</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* State and Zip - Optional - Full Width */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="state" className="font-medium">
                          State/Province <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                        </Label>
                        <Input 
                          id="state" 
                          placeholder="Enter state or province" 
                          value={billingDetails.state}
                          onChange={(e) => handleBillingFieldChange('state', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode" className="font-medium">
                          Zip/Postal Code <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                        </Label>
                        <Input 
                          id="zipCode" 
                          placeholder="Enter postal code" 
                          value={billingDetails.zipCode}
                          onChange={(e) => handleBillingFieldChange('zipCode', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {/* Add "Save as default" checkbox at the bottom */}
                    <div className="md:col-span-2 flex items-center space-x-2 mt-2">
                      <Checkbox 
                        id="saveAsDefault" 
                        checked={saveAsDefault}
                        onCheckedChange={(checked) => setSaveAsDefault(checked === true)}
                      />
                      <label 
                        htmlFor="saveAsDefault" 
                        className="text-sm text-muted-foreground leading-none cursor-pointer"
                      >
                        Save these billing details for future orders
                        {saveAsDefault && usingDefaultBillingDetails && (
                          <span className="ml-1 text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full">Default</span>
                        )}
                      </label>
                    </div>
                    
                    {/* Submit Button - Full Width */}
                    <div className="md:col-span-2 pt-4">
                      <Button type="submit" className="w-full h-11 text-base" size="lg">
                        Continue to Payment
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-green-50 text-green-600 rounded-full p-1.5 border border-green-100">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium">{billingDetails.fullName}</div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-2">
                    <span>{billingDetails.email}</span>
                    {billingDetails.phone && <span>• {billingDetails.phone}</span>}
                    {billingDetails.company && <span>• {billingDetails.company}</span>}
                    {billingDetails.address && (
                      <span className="whitespace-nowrap">
                        • {[
                          billingDetails.address,
                          billingDetails.city,
                          billingDetails.state,
                          billingDetails.zipCode,
                          billingDetails.country !== 'US' ? billingDetails.country : ''
                        ].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={goBack} className="h-8 bg-white">
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            </div>
          )}
          
          {/* Payment Section - Only shown after billing is completed */}
          {billingCompleted && (
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b py-5">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold">Payment Method</CardTitle>
                    <CardDescription>Choose how you'd like to pay</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs bg-white/80 px-2 py-1 rounded-full border">
                    <Lock className="h-3 w-3" />
                    <span>Secure payment</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <PaymentStatusMessages />
                
                {/* Only show payment history if payments exist */}
                {isLoading ? (
                  <div className="py-8 flex justify-center">
                    <div className="flex flex-col items-center">
                      <div className="rounded-full p-2 bg-primary/5">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">Loading payment information...</p>
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
                
                {/* Show payment success message if payment was successful */}
                {renderPaymentSuccessMessage()}
                
                {/* Show button to add more payments if one has been submitted but the order isn't paid */}
                {hasSubmittedPayment && !orderStatus?.isPaid && !showPaymentSelection && (
                  <div className="flex justify-center my-6">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPaymentSelection(true)}
                      className="flex items-center gap-2 h-10"
                      size="lg"
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
                  <div className="space-y-6">
                    <div className="mb-5">
                      <h3 className="text-base font-medium mb-3">Select Payment Method</h3>
                      
                      {/* Payment method options as clickable cards */}
                      <div className="grid grid-cols-1 gap-4">
                        {/* Credit Card Option */}
                        {gatewaysStatus.stripe.enabled && gatewaysStatus.stripe.stripeConnected && (
                          <div 
                            className={`p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors shadow-sm ${
                              selectedMethod === 'stripe' ? 'border-primary bg-primary/5' : 'border-muted'
                            }`}
                            onClick={() => handleMethodSelect('stripe')}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`rounded-full p-2 ${selectedMethod === 'stripe' ? 'bg-primary/10' : 'bg-slate-100'}`}>
                                <CreditCard className={`h-5 w-5 ${selectedMethod === 'stripe' ? 'text-primary' : 'text-slate-500'}`} />
                              </div>
                              <div>
                                <p className="font-medium">Credit Card</p>
                                <p className="text-sm text-muted-foreground">Pay securely using your credit or debit card</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Manual Payment Option */}
                        {gatewaysStatus.manual.enabled && (
                          <div 
                            className={`p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors shadow-sm ${
                              selectedMethod === 'manual' ? 'border-primary bg-primary/5' : 'border-muted'
                            }`}
                            onClick={() => handleMethodSelect('manual')}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`rounded-full p-2 ${selectedMethod === 'manual' ? 'bg-primary/10' : 'bg-slate-100'}`}>
                                <Receipt className={`h-5 w-5 ${selectedMethod === 'manual' ? 'text-primary' : 'text-slate-500'}`} />
                              </div>
                              <div>
                                <p className="font-medium">Bank Transfer</p>
                                <p className="text-sm text-muted-foreground">Upload proof of payment after bank transfer</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Render the appropriate payment form based on selected method */}
                    {renderPaymentForm()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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

            {/* Payment Button - Only shown after billing is completed */}
            {billingCompleted && !(selectedMethod === 'manual' && paymentStatus === 'success') && (
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
} 