import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { PaymentManagement } from "./_components/payment-management";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { PaymentService } from "@/services/payment.service";

async function PaymentsPage(params: OrgAccessHOCProps) {
    const { org, user } = await params;

  if (!user) {
    return <div>Not authenticated</div>;
  }

  // Fetch payments
  const payments = await PaymentService.getPaymentsByOrgId(org.id);
  
  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      <PaymentManagement 
        orgId={org.id} 
        userId={user.id} 
        initialPayments={payments}
      />
    </div>
  );
}

export default withOrgAccess(PaymentsPage); 