import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { notFound } from "next/navigation";
import { Payment } from "@/services/payment/types";
import PaymentDetails from "./_components/payment-details";
import { permissions } from "@/lib/types/permissions";

interface PaymentDetailsPageProps extends OrgAccessHOCProps {
  params: Promise<{
    slug: string;
    paymentId: string;
    orgSlug: string;
  }>;
}

async function PaymentDetailsPage({ org, user, userPermissions, params: _params }: PaymentDetailsPageProps) {
  const params = await _params;
  
  if (!user) {
    return <div>Not authenticated</div>;
  }

  const supabase = await createServiceRoleClient();

  try {
    console.log("Fetching payment with ID:", params.paymentId);
    
    // Step 1: Get basic payment details - Remove the user_id join which causes the error
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        stripe_payments(*),
        manual_payments(*),
        payment_uploads(
          upload:uploads(*)
        ),
        orders(
          *,
          suborders(
            *,
            product:products(*)
          )
        )
      `)
      .eq('id', params.paymentId)
      .eq('group_id', org.id)
      .single();

    if (error || !payment) {
      console.error("Error fetching payment:", error);
      notFound();
    }

    console.log("Payment found:", payment.id, "Order ID:", payment.order_id);

    // Step 2: Get user information separately if we have user_id in the payment
    if (payment.user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', payment.user_id)
        .single();

      if (userData) {
        payment.user = {
          id: userData.id,
          email: userData.email,
          name: userData.full_name
        };
      }
    }

    // Step 3: Check for billing details
    let billing = null;

    // First check if there are order-specific billing details
    if (payment.order_id) {
      console.log("Looking for order-specific billing details for order:", payment.order_id);
      const { data: orderBilling } = await supabase
        .from('billing_details')
        .select('*')
        .eq('order_id', payment.order_id)
        .limit(1);

      if (orderBilling && orderBilling.length > 0) {
        console.log("Found order-specific billing details");
        billing = orderBilling[0];
      }
    }

    // If no order billing, check for user's default billing details
    if (!billing && payment.user_id) {
      console.log("Looking for user's default billing details for user:", payment.user_id);
      const { data: userBilling } = await supabase
        .from('billing_details')
        .select('*')
        .eq('user_id', payment.user_id)
        .eq('is_default', true)
        .limit(1);

      if (userBilling && userBilling.length > 0) {
        console.log("Found user's default billing details");
        billing = userBilling[0];
      }
    }

    // Format billing details if found
    if (billing) {
      payment.billing_details = {
        name: billing.full_name || "",
        email: billing.email || "",
        phone: billing.phone || ""
      };

      // Only add address if there's at least one field with data
      if (billing.address || billing.city || billing.state || billing.zip_code || billing.country) {
        payment.billing_details.address = {
          line1: billing.address || "",
          line2: null,
          city: billing.city || "",
          state: billing.state || "",
          postal_code: billing.zip_code || "",
          country: billing.country || ""
        };
      }
      console.log("Added billing details to payment", payment.billing_details);
    } else {
      console.log("No billing details found for this payment");
    }

    return <PaymentDetails payment={payment} org={org} user={user} userPermissions={userPermissions || []} />;
  } catch (error) {
    console.error("Unexpected error in payment details page:", error);
    // Return a simple error component instead of using notFound()
    return (
      <div className="container py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-lg font-medium text-red-800">Error loading payment details</h2>
          <p className="mt-2 text-sm text-red-700">
            There was a problem loading the payment details. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}

export default withOrgAccess(PaymentDetailsPage, {
  permissions: [permissions.payments.view],
  onAccessDenied: { action: 'error' }
}); 
