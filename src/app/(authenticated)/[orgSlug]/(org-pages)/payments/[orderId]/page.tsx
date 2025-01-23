import { createClient } from "@/lib/utils/supabase/server";
import { withOrgAccess } from "@/lib/hoc/org";
import { ManualPaymentForm } from "../_components/manual-payment-form";
import { PaymentManagement } from "../_components/payment-management";
import { auth } from "@/lib/auth/helper";

async function PaymentPage({ params }: { params: { orderId: string; orgSlug: string } }) {
  const supabase = await createClient();
  const session = await auth();

  if (!session) {
    return <div>Not authenticated</div>;
  }

  // Get order details
  const { data: order } = await supabase
    .from('orders')
    .select('*, products(*)')
    .eq('id', params.orderId)
    .single();

  if (!order) {
    return <div>Order not found</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Order Payment</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <ManualPaymentForm
          orderId={params.orderId}
          orgId={params.orgSlug}
          expectedAmount={order.amount}
          currency={order.currency}
        />
        <PaymentManagement 
          orderId={params.orderId}
          userId={session.user.id}
        />
      </div>
    </div>
  );
}

export default withOrgAccess(PaymentPage, {
  permissions: ['group.edit'],
}); 