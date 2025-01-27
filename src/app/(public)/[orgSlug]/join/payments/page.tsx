import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { PaymentManagement } from "@/app/(public)/[orgSlug]/join/payments/_components/payment-management";
import { createStorageProvider } from "@/services/storage/storage-settings.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { getUserMembershipApplications } from "@/services/applications.service";
import { redirect } from "next/navigation";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { PaymentForm } from './_components/payment-form';

interface SearchParams {
  applicationId?: string;
  orderId?: string;
  method?: string;
}

function ErrorDisplay({ message, details, orgSlug }: { message: string; details?: string; orgSlug: string }) {
  return (
    <div className="container max-w-4xl py-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{message}</h2>
              {details && <p className="text-sm text-muted-foreground">{details}</p>}
            </div>
            <Button asChild>
              <Link href={`/@${orgSlug}/join`}>Return to Join Page</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
  const applicationId = searchParams?.applicationId;
  const orderId = searchParams?.orderId;
  const method = searchParams?.method || 'manual';

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
      .from('orders')
      .select('*, payments(*), applications!orders_application_id_fkey(*)')
      .eq('application_id', applicationId)
      .single();

    if (existingOrder) {
      order = existingOrder;
    } else {
      // Create new order for application
      const orderData = {
        user_id: user.id,
        group_id: org.id,
        type: 'membership',
        product_id: application.product_id,
        application_id: application.id,
        amount: application.product.price,
        currency: application.product.currency || 'USD',
        status: 'pending'
      };

      const { data: newOrder, error: createError } = await serviceClient
        .from('orders')
        .insert(orderData)
        .select('*, payments(*), applications!orders_application_id_fkey(*)')
        .single();

      if (createError || !newOrder) {
        console.log('Failed to create order:', { 
          createError, 
          application,
          userId: user.id, 
          orgId: org.id,
          productId: application.product_id
        });
        return <ErrorDisplay 
          message="Failed to create order" 
          details="There was an error creating your order. Please try again later." 
          orgSlug={org.slug}
        />;
      }

      // Link the order to the application
      const { error: linkError } = await serviceClient
        .from('applications')
        .update({ order_id: newOrder.id })
        .eq('id', application.id);

      if (linkError) {
        console.log('Failed to link order to application:', { 
          linkError, 
          orderId: newOrder.id,
          applicationId: application.id 
        });
        return <ErrorDisplay 
          message="Failed to create order" 
          details="There was an error creating your order. Please try again later." 
          orgSlug={org.slug}
        />;
      }

      order = newOrder;
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

  return (
    <div className="container max-w-7xl py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Payment Form */}
        <div className="lg:col-span-2">
          <PaymentForm 
            order={order}
            orgId={org.id}
            defaultMethod={method}
          />
        </div>

        {/* Right Column - Order Details & Payment History */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-medium">{order.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{order.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">
                    {(order.amount / 100).toLocaleString(undefined, {
                      style: 'currency',
                      currency: order.currency
                    })}
                  </span>
                </div>
                {order.payments?.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Payment Status</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Paid</span>
                        <span className="font-medium">
                          {(order.payments.reduce((sum: number, p: { status: string; amount: number }) => 
                            sum + (p.status === 'approved' ? p.amount : 0), 0) / 100).toLocaleString(undefined, {
                            style: 'currency',
                            currency: order.currency
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pending</span>
                        <span className="font-medium">
                          {(order.payments.reduce((sum: number, p: { status: string; amount: number }) => 
                            sum + (p.status === 'pending' ? p.amount : 0), 0) / 100).toLocaleString(undefined, {
                            style: 'currency',
                            currency: order.currency
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="font-medium">
                          {((order.amount - order.payments.reduce((sum: number, p: { status: string; amount: number }) => 
                            sum + (p.status === 'approved' ? p.amount : 0), 0)) / 100).toLocaleString(undefined, {
                            style: 'currency',
                            currency: order.currency
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {order.payments?.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PaymentManagement
                  orgId={org.id}
                  userId={user.id}
                  orderId={order.id}
                  initialPayments={order.payments}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default withOrgAccess(PaymentsPage); 
