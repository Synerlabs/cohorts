import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { PaymentsClient } from "./_components/payments-client";

interface SearchParams {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

async function PaymentsPage(params: OrgAccessHOCProps & { searchParams: SearchParams }) {
  const { org, user, searchParams:_searchParams } = params;
  const searchParams = await _searchParams;

  if (!user) {
    return <div>Not authenticated</div>;
  }

  // Initialize supabase client
  const supabase = await createServiceRoleClient();

  // Parse search params
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const pageSize = searchParams.pageSize ? parseInt(searchParams.pageSize) : 10;
  const sortBy = searchParams.sortBy || 'created_at';
  const sortOrder = searchParams.sortOrder || 'desc';
  const search = searchParams.search || '';

  // Calculate pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build query
  let query = supabase
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
    `, { count: 'exact' })
    .eq('group_id', org.id);

  // Add search if provided
  if (search) {
    query = query.or(`
      id.ilike.%${search}%,
      amount::text.ilike.%${search}%,
      currency.ilike.%${search}%,
      status.ilike.%${search}%
    `);
  }

  // Add sorting and pagination
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to);

  // Execute query
  const { data: payments, error, count } = await query;

  if (error) {
    console.error('Error fetching payments:', error);
    return <div>Error loading payments</div>;
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

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