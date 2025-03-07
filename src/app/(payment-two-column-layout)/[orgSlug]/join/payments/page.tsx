import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { createStorageProvider } from "@/services/storage/storage-settings.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2, Receipt, Star, Clock, Lock } from "lucide-react";
import Link from "next/link";
import { getUserMembershipApplications } from "@/services/applications.service";
import { redirect } from "next/navigation";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { PaymentForm } from './_components/payment-form';
import { OrderService } from "@/services/order.service";
import { getPaymentGatewaysStatus } from "@/services/payment-gateways.service";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { PaymentDetailsService } from "@/services/payment-details.service";
import type { MembershipTier } from "@/types/membership";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SearchParams {
  applicationId?: string;
  orderId?: string;
  method?: string;
}

function ErrorDisplay({ message, details, orgSlug }: { message: string; details?: string; orgSlug: string }) {
  return (
    <div className="container max-w-5xl py-12">
      <Card className="shadow-md border-destructive/20">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-destructive/10 rounded-full">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">{message}</h2>
              {details && <p className="text-muted-foreground">{details}</p>}
            </div>
            <Button size="lg" asChild className="mt-2">
              <Link href={`/@${orgSlug}/join`} className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Join Page
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Add function to check for active Stripe accounts
async function checkActiveStripeAccount(orgId: string) {
  const supabase = await createServiceRoleClient();
  
  const { data: accounts, error } = await supabase
    .from('stripe_connected_accounts')
    .select('is_active')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .limit(1);

  if (error) {
    console.error('Failed to check for active Stripe accounts:', error);
    return false;
  }

  return accounts && accounts.length > 0;
}

async function PaymentsPage({ org, user, searchParams }: OrgAccessHOCProps & { searchParams: SearchParams }) {
  if (!user) {
    // Redirect unauthenticated users to sign in
    redirect(`/sign-in?redirect=/@${org.slug}/join/payments${
      searchParams.applicationId ? `?applicationId=${searchParams.applicationId}` : ''
    }${searchParams.orderId ? `?orderId=${searchParams.orderId}` : ''}`);
  }

  const serviceClient = await createServiceRoleClient();
  let order;
  const _searchParams = await searchParams;
  const applicationId = _searchParams?.applicationId;
  const orderId = _searchParams?.orderId;
  const method = _searchParams?.method || 'manual';

  // Get payment gateways status
  const gatewaysStatus = await getPaymentGatewaysStatus(org.id);

  // Check if any payment method is available
  if (!gatewaysStatus.stripe.enabled && !gatewaysStatus.manual.enabled) {
    return <ErrorDisplay 
      message="No payment methods are currently available" 
      details="Please contact the organization administrator."
      orgSlug={org.slug}
    />;
  }

  if (!orderId && !applicationId) {
    return <ErrorDisplay 
      message="No order or application found" 
      details="Please start from the join page to submit a payment."
      orgSlug={org.slug}
    />;
  }

  if (orderId) {
    // Get existing order
    const { data, error } = await serviceClient
      .from('orders')
      .select('*, payments(*), applications!orders_application_id_fkey(*)')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .eq('group_id', org.id)
      .single();

    if (error || !data) {
      console.log('Order lookup error:', { error, data, orderId, userId: user.id, orgId: org.id });
      return <ErrorDisplay 
        message="Order not found" 
        details="The order you're looking for doesn't exist or you don't have permission to view it."
        orgSlug={org.slug}
      />;
    }
    order = data;
    console.log('Order fetched successfully:', order.id);
  } else if (applicationId) {
    // Get application
    const applications = await getUserMembershipApplications(user.id, org.id);
    const application = applications.find(app => app.id === applicationId);

    if (!application) {
      console.log('Application lookup error:', { applicationId, userId: user.id, orgId: org.id });
      return <ErrorDisplay 
        message="Application not found" 
        details="The application you're looking for doesn't exist or you don't have permission to view it."
        orgSlug={org.slug}
      />;
    }

    // Verify application has required properties
    if (!application.product?.price || !application.product_id) {
      console.log('Invalid application data:', { 
        application,
        hasProduct: !!application.product,
        hasPrice: !!application.product?.price,
        hasProductId: !!application.product_id,
        productPrice: application.product?.price,
        productId: application.product_id
      });
      return <ErrorDisplay 
        message="Invalid application data" 
        details="The application is missing required information. Please try again or contact support."
        orgSlug={org.slug}
      />;
    }

    // Check if application already has any order (not just pending)
    const { data: existingOrder, error: orderError } = await serviceClient
      .from('applications')
      .select(`
        order:orders(
          *,
          payments(*)
        )
      `)
      .eq('id', applicationId)
      .single();

    if (existingOrder?.order) {
      order = existingOrder.order;
    } else {
      // Create new order for application
      try {
        // Get the group user ID from the application
        const { data: groupUser, error: groupUserError } = await serviceClient
          .from('applications')
          .select('group_user_id')
          .eq('id', application.id)
          .single();

        if (groupUserError || !groupUser) {
          throw new Error('Failed to get group user ID');
        }

        // Create order with validated data
        console.log('Creating membership order with validated data');
        order = await OrderService.createMembershipOrder(
          user.id,
          application.product_id,
          groupUser.group_user_id,
          application.id,
          org.id
        );

        // Link the order to the application
        const { error: linkError } = await serviceClient
          .from('applications')
          .update({ order_id: order.id })
          .eq('id', application.id);

        if (linkError) {
          console.log('Failed to link order to application:', { 
            linkError, 
            orderId: order.id,
            applicationId: application.id 
          });
          throw new Error('Failed to link order to application');
        }
      } catch (error) {
        console.log('Failed to create order:', { 
          error, 
          application,
          userId: user.id, 
          productId: application.product_id
        });
        return <ErrorDisplay 
          message="Failed to create order" 
          details="There was an error creating your order. Please try again later." 
          orgSlug={org.slug}
        />;
      }
    }
  }

  if (!order) {
    return <ErrorDisplay 
      message="No order found" 
      details="Please start from the join page to submit a payment."
      orgSlug={org.slug}
    />;
  }

  // Get storage provider for manual payments
  const provider = await createStorageProvider(org.id);

  // Check for active Stripe account
  const hasActiveStripeAccount = await checkActiveStripeAccount(org.id);

  // Fetch membership details using our service
  const membershipDetails = await PaymentDetailsService.getMembershipDetailsForOrder(order.id);
  
  // Parse benefits using the service
  const benefits = PaymentDetailsService.parseBenefits(membershipDetails);
  
  console.log('Membership details found:', membershipDetails ? membershipDetails.name : 'None');
  console.log('Benefits count:', benefits.length);

  return (
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
              <PaymentForm 
                order={order}
                orgId={org.id}
                defaultMethod={gatewaysStatus.manual.enabled ? 'manual' : 'card'}
                hasActiveStripeAccount={gatewaysStatus.stripe.enabled && gatewaysStatus.stripe.stripeConnected}
              />
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
                <span>$0.00</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatCurrency(order.amount, order.currency)}</span>
              </div>
            </div>
            
            <Button type="submit" className="w-full" size="lg">
              Complete Payment
            </Button>
            
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

export default withOrgAccess(PaymentsPage, { allowGuest: false }); 