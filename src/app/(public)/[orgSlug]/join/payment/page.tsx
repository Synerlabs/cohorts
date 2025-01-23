import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { withOrgAccess, OrgAccessHOCProps } from "@/lib/hoc/org";
import { getUserMembershipApplications } from "@/services/applications.service";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { getCurrentUser } from "@/services/user.service";
import { ManualPaymentForm } from "@/app/(authenticated)/[orgSlug]/(org-pages)/payments/_components/manual-payment-form";
import { createServiceRoleClient } from "@/lib/utils/supabase/server";

async function PaymentPage({ org, user }: OrgAccessHOCProps) {
  if (!user) {
    redirect(`/@${org.slug}/join`);
  }

  const { data: currentUser } = await getCurrentUser();
  if (!currentUser?.user) throw new Error('User not found');

  // Get user's applications
  const applications = await getUserMembershipApplications(user.id, org.id);
  const latestApplication = applications[0];
  
  // Redirect if:
  // 1. No application exists
  // 2. Application is rejected
  // 3. Application is not in pending_payment status
  if (!latestApplication || 
      latestApplication.rejected_at || 
      latestApplication.status !== 'pending_payment') {
    redirect(`/@${org.slug}/join`);
  }

  // Create order if it doesn't exist
  let orderId = latestApplication.order_id;
  if (!orderId) {
    const supabase = await createServiceRoleClient();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        product_id: latestApplication.product.id,
        type: 'membership',
        status: 'pending',
        amount: latestApplication.product.price,
        currency: latestApplication.product.currency,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Link order to application
    const { error: linkError } = await supabase
      .from('applications')
      .update({ order_id: order.id })
      .eq('id', latestApplication.id);

    if (linkError) throw linkError;

    orderId = order.id;
  }

  // If we still don't have an orderId, something went wrong
  if (!orderId) {
    throw new Error('Failed to create or retrieve order');
  }

  return (
    <div className="container max-w-4xl py-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Complete Payment</CardTitle>
          <CardDescription>
            Complete your payment to join {org.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">Membership Details</h3>
            <div className="text-sm text-muted-foreground">
              <p>Tier: {latestApplication.product.name}</p>
              <p>Price: ${latestApplication.product.price ? latestApplication.product.price / 100 : 0}</p>
            </div>
          </div>
          <ManualPaymentForm 
            orderId={orderId}
            orgId={org.id}
            expectedAmount={latestApplication.product.price}
            currency={latestApplication.product.currency || 'USD'}
          />
        </CardContent>
      </Card>
    </div>
  );
} 

export default withOrgAccess(PaymentPage);