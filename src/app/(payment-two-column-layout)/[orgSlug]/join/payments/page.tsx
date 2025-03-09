import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { createStorageProvider } from "@/services/storage/storage-settings.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2, Receipt, Star, Clock, Lock } from "lucide-react";
import Link from "next/link";
import { getUserMembershipApplications } from "@/services/applications.service";
import { redirect } from "next/navigation";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { PaymentVerification } from './_components/payment-verification';
import { OrderService } from "@/services/order.service";
import { getPaymentGatewaysStatus } from "@/services/payment-gateways.service";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { PaymentDetailsService } from "@/services/payment-details.service";
import type { MembershipTier } from "@/types/membership";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentClient } from './_components/payment-client';
import { createStripePaymentIntent, createManualPayment } from "./actions";
import { createStripePaymentIntentForClient } from "./payment-actions";

interface SearchParams {
  applicationId?: string;
  orderId?: string;
  method?: string;
  redirect_status?: string;
  payment_intent_client_secret?: string;
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

// Remove the 'use server' directive since we're moving the action to its own file
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

// Server-side function to fetch billing details
async function getBillingDetailsForOrderServer(orderId: string) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from('billing_details')
    .select('*')
    .eq('order_id', orderId)
    .limit(1)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - not an error for our purposes
      return null;
    }
    console.error('Error fetching billing details for order:', error);
    return null;
  }
  
  return data;
}

// Main server component
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
  const redirectStatus = _searchParams?.redirect_status;
  const paymentIntentClientSecret = _searchParams?.payment_intent_client_secret;

  // Check if we're returning from a successful Stripe payment
  if (redirectStatus === 'succeeded' && paymentIntentClientSecret) {
    // Extract payment intent ID from the client secret (format: pi_XXXXXX_secret_YYYY)
    const clientSecret = typeof paymentIntentClientSecret === 'string' 
      ? paymentIntentClientSecret 
      : paymentIntentClientSecret[0];
    
    const paymentIntentId = clientSecret.split('_secret_')[0];
    
    // Check if we have the orderId - if not, we need to find the order associated with this payment
    let targetOrderId = orderId;
    if (!targetOrderId) {
      try {
        // Look up the order by paymentIntentId
        const { data: paymentData, error: paymentError } = await serviceClient
          .from('stripe_payments')
          .select(`
            payment:payment_id(
              order_id
            )
          `)
          .eq('stripe_payment_intent_id', paymentIntentId)
          .single();
        
        if (paymentData && paymentData.payment) {
          // Use type assertion to handle the unknown structure
          const payment = paymentData.payment as any;
          if (payment.order_id) {
            targetOrderId = payment.order_id;
          }
        }
      } catch (error) {
        console.error('Error looking up order for payment intent:', error);
      }
      
      if (!targetOrderId) {
        console.log('Could not find order for payment intent:', paymentIntentId);
      }
    }
    
    // If we found the order, include it in the URL when we return from verification
    return <PaymentVerification 
      orgSlug={org.slug}
      orderId={targetOrderId || ''}
      paymentIntentId={paymentIntentId}
    />;
  }

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

  // After handling any redirect scenarios, check if we should render the main payment client
  if (!redirectStatus || redirectStatus !== 'succeeded') {
    // Make sure stripeConnected is defined
    const safeGatewaysStatus = {
      stripe: {
        enabled: gatewaysStatus.stripe.enabled,
        stripeConnected: gatewaysStatus.stripe.stripeConnected || false
      },
      manual: {
        enabled: gatewaysStatus.manual.enabled
      }
    };
    
    // Fetch billing details on the server
    const existingBillingDetails = await getBillingDetailsForOrderServer(order.id);
    
    return (
      <PaymentClient 
        org={org}
        user={user}
        order={order}
        membershipDetails={membershipDetails}
        benefits={benefits}
        gatewaysStatus={safeGatewaysStatus}
        createStripePaymentIntentFn={createStripePaymentIntentForClient}
        existingBillingDetails={existingBillingDetails}
      />
    );
  }
}

export default withOrgAccess(PaymentsPage, { allowGuest: false }); 