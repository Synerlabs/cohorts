import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { notFound } from "next/navigation";
import { Payment } from "@/services/payment/types";
import PaymentDetails from "./_components/payment-details";

interface PaymentDetailsPageProps extends OrgAccessHOCProps {
  params: {
    slug: string;
    paymentId: string;
  };
}

async function PaymentDetailsPage({ org, user, params: _params }: PaymentDetailsPageProps) {
  const params = await _params;
  
  if (!user) {
    return <div>Not authenticated</div>;
  }

  const supabase = await createServiceRoleClient();

  // Get payment details
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
    notFound();
  }

  return <PaymentDetails payment={payment} org={org} user={user} />;
}

export default withOrgAccess(PaymentDetailsPage); 
