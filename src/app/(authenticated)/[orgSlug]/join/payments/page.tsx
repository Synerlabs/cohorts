import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { PaymentManagement } from "./_components/payment-management";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { createStorageProvider } from "@/services/storage/storage-settings.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { getUserMembershipApplications } from "@/services/applications.service";

interface SearchParams {
  applicationId?: string;
  orderId?: string;
}

function ErrorDisplay({ message, details }: { message: string; details?: string }) {
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
              <Link href="join">Return to Join Page</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function PaymentsPage({ org, user, searchParams }: OrgAccessHOCProps & { searchParams: SearchParams }) {
  if (!user) {
    return <ErrorDisplay message="Not authenticated" details="Please sign in to continue." />;
  }

  const supabase = await createServiceRoleClient();
  let order;
  const applicationId = searchParams?.applicationId;
  const orderId = searchParams?.orderId;

  if (orderId) {
    // Get existing order
    const { data, error } = await supabase
      .from('orders')
      .select('*, payments(*), applications(*)')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .eq('org_id', org.id)
      .single();

    if (error || !data) {
      console.log('Order lookup error:', { error, data, orderId, userId: user.id, orgId: org.id });
      return <ErrorDisplay 
        message="Order not found" 
        details="The order you're looking for doesn't exist or you don't have permission to view it." 
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
      />;
    }

    // Check if application already has an order
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*, payments(*), applications(*)')
      .eq('id', application.order_id)
      .eq('status', 'pending')
      .single();

    if (existingOrder) {
      order = existingOrder;
    } else {
      // Create new order for application
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          type: 'membership',
          product_id: application.product_id,
          amount: application.product.price,
          currency: application.product.currency || 'USD',
          status: 'pending'
        })
        .select('*, payments(*), applications(*)')
        .single();

      if (orderError || !newOrder) {
        console.log('Failed to create order:', { 
          orderError, 
          application,
          userId: user.id, 
          orgId: org.id 
        });
        return <ErrorDisplay 
          message="Failed to create order" 
          details="There was an error creating your order. Please try again later." 
        />;
      }

      // Link the order to the application
      const { error: linkError } = await supabase
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
        />;
      }

      order = newOrder;
    }
  } else {
    // Check for pending payment applications
    const applications = await getUserMembershipApplications(user.id, org.id);
    const pendingApplication = applications.find(app => app.status === 'pending_payment');

    // Only show error if there are no pending payment applications
    if (!pendingApplication) {
      console.log('No pending payment applications:', { 
        applications, 
        userId: user.id, 
        orgId: org.id,
        status: 'pending_payment'
      });
      return <ErrorDisplay 
        message="No pending payments" 
        details="You don't have any pending payments at this time." 
      />;
    }

    // Check if application already has an order
    const { data: existingOrder, error: orderError } = await supabase
      .from('orders')
      .select('*, payments(*), applications(*)')
      .eq('id', pendingApplication.order_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingOrder) {
      order = existingOrder;
    } else {
      // Create new order for application
      const { data: newOrder, error: createError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          type: 'membership',
          product_id: pendingApplication.product_id,
          amount: pendingApplication.product.price,
          currency: pendingApplication.product.currency || 'USD',
          status: 'pending'
        })
        .select('*, payments(*), applications(*)')
        .single();

      if (createError || !newOrder) {
        console.log('Failed to create order:', { 
          createError, 
          pendingApplication,
          userId: user.id, 
          orgId: org.id 
        });
        return <ErrorDisplay 
          message="Failed to create order" 
          details="There was an error creating your order. Please try again later." 
        />;
      }

      // Link the order to the application
      const { error: linkError } = await supabase
        .from('applications')
        .update({ order_id: newOrder.id })
        .eq('id', pendingApplication.id);

      if (linkError) {
        console.log('Failed to link order to application:', { 
          linkError, 
          orderId: newOrder.id,
          applicationId: pendingApplication.id 
        });
        return <ErrorDisplay 
          message="Failed to create order" 
          details="There was an error creating your order. Please try again later." 
        />;
      }

      order = newOrder;
    }
  }

  // Get storage provider for manual payments
  const provider = await createStorageProvider(org.id);

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Methods</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how you'd like to pay the membership fee
              </p>
            </div>
            <div className="text-2xl font-semibold">
              {(order.amount / 100).toLocaleString(undefined, {
                style: 'currency',
                currency: order.currency
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {provider && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Manual Payment</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload proof of payment after bank transfer
                  </p>
                </div>
                <Button variant="outline">
                  Add Manual Payment
                </Button>
              </div>
            )}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Pay with Card</h3>
                <p className="text-sm text-muted-foreground">
                  Secure payment via Stripe
                </p>
              </div>
              <Button>
                Pay Now
              </Button>
            </div>
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
  );
}

export default withOrgAccess(PaymentsPage); 