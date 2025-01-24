import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { PaymentManagement } from "./_components/payment-management";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { createStorageProvider } from "@/services/storage/storage-settings.service";
import { PaymentServiceFactory } from "@/services/payment/payment.service.factory";

interface SearchParams {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

async function PaymentsPage(params: OrgAccessHOCProps & { searchParams: SearchParams }) {
  const { org, user, searchParams } = await params;

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

  // Parse search params
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const pageSize = searchParams.pageSize ? parseInt(searchParams.pageSize) : 10;
  const sortBy = searchParams.sortBy || 'created_at';
  const sortOrder = searchParams.sortOrder || 'desc';
  const search = searchParams.search || '';

  // Fetch payments with pagination and sorting
  const { data: payments, total, totalPages } = await paymentService.getPaymentsByOrgId(org.id, {
    page,
    pageSize,
    sortBy,
    sortOrder,
    search
  });
  
  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      <PaymentManagement 
        orgId={org.id} 
        userId={user.id} 
        initialPayments={payments}
        pagination={{
          page,
          pageSize,
          total,
          totalPages
        }}
        sorting={{
          sortBy,
          sortOrder
        }}
        search={search}
      />
    </div>
  );
}

export default withOrgAccess(PaymentsPage); 