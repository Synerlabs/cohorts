import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { createStorageProvider } from "@/services/storage/storage-settings.service";
import { PaymentServiceFactory } from "@/services/payment/payment.service.factory";
import { PaymentsClient } from "./_components/payments-client";

interface SearchParams {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

async function PaymentsPage(params: OrgAccessHOCProps & { searchParams: SearchParams }) {
  const { org, user, searchParams } = params;

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

  // Only pass serializable data to client component
  const serializedOrg = {
    id: org.id,
    name: org.name,
    slug: org.slug,
  };

  const serializedUser = {
    id: user.id,
    email: user.email,
  };

  return (
    <PaymentsClient
      org={serializedOrg}
      user={serializedUser}
      payments={payments}
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
  );
}

export default withOrgAccess(PaymentsPage); 