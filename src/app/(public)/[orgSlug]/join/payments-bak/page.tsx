import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { createStorageProvider } from "@/services/storage/storage-settings.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2, Receipt, Star, Clock } from "lucide-react";
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
        details="The order you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it."
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
        details="The application you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it."
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
    <div className="container max-w-6xl py-12 px-4 sm:px-6">
      {/* Page Header */}
      <div className="mb-8 space-y-3">
        <Link 
          href={`/@${org.slug}/join`}
          className="text-sm inline-flex items-center font-medium text-primary hover:underline"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Back to membership options
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Complete Your Payment</h1>
        <p className="text-muted-foreground">Process your payment to finalize your membership application.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Payment Form */}
        <div className="lg:col-span-2 space-y-6">
          <PaymentForm 
            order={order}
            orgId={org.id}
            defaultMethod={gatewaysStatus.manual.enabled ? 'manual' : 'card'}
            hasActiveStripeAccount={gatewaysStatus.stripe.enabled && gatewaysStatus.stripe.stripeConnected}
          />
          
          <Card className="shadow-sm border-muted/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <CheckCircle2 className="mr-2 h-5 w-5 text-emerald-500" />
                Secure Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All transactions are secure and encrypted. By completing your payment, you agree to the organization&apos;s terms and conditions.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary & Membership Details */}
        <div className="space-y-6">
          {/* Membership Details Card */}
          {membershipDetails && (
            <Card className="shadow-sm border-primary/20 overflow-hidden">
              <div className="bg-primary/5 border-b border-primary/10 px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium flex items-center">
                      <Star className="h-4 w-4 mr-1.5 text-primary" />
                      Membership Details
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">You are joining as a:</p>
                  </div>
                  {membershipDetails.interval && (
                    <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">
                      {membershipDetails.interval === 'month' ? 'Monthly' : 
                       membershipDetails.interval === 'year' ? 'Annual' : 
                       membershipDetails.interval === 'lifetime' ? 'Lifetime' : 
                       membershipDetails.interval}
                    </Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h4 className="text-xl font-semibold">{membershipDetails.name}</h4>
                  {membershipDetails.description && (
                    <p className="text-muted-foreground text-sm mt-1">{membershipDetails.description}</p>
                  )}
                  
                  <div className="mt-2 flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-1.5 text-muted-foreground" />
                    <span>
                      {membershipDetails.interval === 'month' ? 'Monthly membership' : 
                       membershipDetails.interval === 'year' ? 'Annual membership' : 
                       membershipDetails.interval === 'lifetime' ? 'Lifetime membership' : 
                       'Membership'}
                    </span>
                  </div>
                </div>
                
                {benefits.length > 0 && (
                  <div className="space-y-3 pt-3">
                    <h5 className="text-sm font-medium">Membership Benefits</h5>
                    <ul className="space-y-2">
                      {benefits.map((benefit: string, index: number) => (
                        <li key={index} className="flex text-sm">
                          <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Order Summary Card */}
          <Card className="shadow-sm border-muted/60">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center">
                <Receipt className="mr-2 h-5 w-5" />
                Order Summary
              </CardTitle>
              <CardDescription>Details about your membership</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{order.id.split('-')[0]}...</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`capitalize font-medium px-2 py-0.5 rounded text-xs ${
                    order.status === 'completed' || order.status === 'paid' 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : order.status === 'pending' 
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="font-medium">Total Amount</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(order.amount, order.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/20 p-4 rounded-b-lg flex justify-center">
              <Button variant="outline" asChild className="w-full">
                <Link href={`/@${org.slug}/join`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Membership Options
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="shadow-sm border-primary/10 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If you&apos;re experiencing any issues with your payment, please contact the organization administrator for assistance.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default withOrgAccess(PaymentsPage, { allowGuest: false }); 
