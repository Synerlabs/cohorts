import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { PaymentManagement } from "./_components/payment-management";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { createStorageProvider } from "@/services/storage/storage-settings.service";
import { PaymentServiceFactory } from "@/services/payment/payment.service.factory";

async function PaymentsPage(params: OrgAccessHOCProps) {
    const { org, user } = await params;

  if (!user) {
    return <div>Not authenticated</div>;
  }

  // Initialize services
  const supabase = await createServiceRoleClient();
  const provider = await createStorageProvider(org.id);
  
  if (!provider) {
    return <div>Storage provider not configured</div>;
  }

  // Create payment service
  const paymentServiceFactory = new PaymentServiceFactory(supabase, provider);
  const paymentService = paymentServiceFactory.createService('manual');

  // Fetch payments
  const payments = await paymentService.getPaymentsByOrgId(org.id);
  
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