import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { createStorageProvider } from "@/services/storage/storage-settings.service";
import { PaymentServiceFactory } from "@/services/payment/payment.service.factory";
import { PaymentsClient } from "./_components/payments-client";
import { Payment } from "@/services/payment/types";

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

  // Create payment services
  const paymentServiceFactory = new PaymentServiceFactory(supabase, provider);
  const manualPaymentService = paymentServiceFactory.createService('manual');
  const stripePaymentService = paymentServiceFactory.createService('stripe');

  // Parse search params
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const pageSize = searchParams.pageSize ? parseInt(searchParams.pageSize) : 10;
  const sortBy = searchParams.sortBy || 'created_at';
  const sortOrder = searchParams.sortOrder || 'desc';
  const search = searchParams.search || '';

  // Fetch both manual and stripe payments
  const [manualPayments, stripePayments] = await Promise.all([
    manualPaymentService.getPaymentsByOrgId(org.id, {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search
    }),
    stripePaymentService.getPaymentsByOrgId(org.id, {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search
    })
  ]);

  // Combine and sort payments
  const allPayments = [...manualPayments.data, ...stripePayments.data].sort((a, b) => {
    if (sortBy === 'created_at') {
      return sortOrder === 'desc' 
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : a.createdAt.getTime() - b.createdAt.getTime();
    }
    return 0;
  });

  // Calculate total
  const total = manualPayments.total + stripePayments.total;
  const totalPages = Math.ceil(total / pageSize);

  // Apply pagination to combined results
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedPayments = allPayments.slice(start, end);

  // Only pass serializable data to client component
  const serializedOrg = {
    id: org.id,
    name: org.name,
    slug: org.slug,
  };

  const serializedUser = {
    id: user.id,
    email: user.email || '',
  };

  return (
    <PaymentsClient
      org={serializedOrg}
      user={serializedUser}
      payments={paginatedPayments}
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