import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { Order, columns } from "./columns";
import { DataTable } from "./data-table";

interface SearchParams {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: string;
}

async function OrdersPage(params: OrgAccessHOCProps & { searchParams: SearchParams }) {
  const { org, user, searchParams:_searchParams } = params;
  const searchParams = await _searchParams;

  if (!user) {
    return <div>Not authenticated</div>;
  }

  // Initialize supabase client
  const supabase = await createServiceRoleClient();

  // Parse search params
  const pageIndex = searchParams.page ? parseInt(searchParams.page) - 1 : 0;
  const pageSize = searchParams.pageSize ? parseInt(searchParams.pageSize) : 10;
  const sortBy = searchParams.sortBy || 'created_at';
  const sortOrder = searchParams.sortOrder || 'desc';
  const search = searchParams.search || '';
  const status = searchParams.status || '';

  // Calculate pagination
  const from = pageIndex * pageSize;
  const to = from + pageSize - 1;

  // Build query
  let query = supabase
    .from('orders')
    .select(`
      *,
      suborders(
        *,
        product:products(*)
      )
    `, { count: 'exact' })
    .eq('group_id', org.id);

  // Add search if provided
  if (search) {
    query = query.or(`
      id.ilike.%${search}%,
      amount::text.ilike.%${search}%,
      currency.ilike.%${search}%,
      status.ilike.%${search}%,
      type.ilike.%${search}%
    `);
  }

  // Add status filter if provided and not "all"
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Add sorting and pagination
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to);

  // Execute query
  const { data: orders, error, count } = await query;

  if (error) {
    console.error('Error fetching orders:', error);
    return <div>Error loading orders</div>;
  }

  const total = count || 0;
  const pageCount = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <DataTable
        columns={columns}
        data={orders || []}
        pageCount={pageCount}
        orgSlug={org.slug}
      />
    </div>
  );
}

export default withOrgAccess(OrdersPage); 
