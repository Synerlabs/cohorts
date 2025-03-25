import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { PaymentsClient } from "./_components/payments-client";
import { permissions } from "@/lib/types/permissions";

interface SearchParams {
  page?: string | string[];
  pageSize?: string | string[];
  sortBy?: string | string[];
  sortOrder?: 'asc' | 'desc' | string | string[];
  search?: string | string[];
  tierId?: string | string[];
}

async function PaymentsPage(params: OrgAccessHOCProps & { searchParams: SearchParams }) {
  const { org, user, searchParams:_searchParams } = params;
  const searchParams = await _searchParams;

  if (!user) {
    return <div>Not authenticated</div>;
  }

  // Initialize supabase client
  const supabase = await createServiceRoleClient();

  // Parse search params and ensure they're strings
  const pageParam = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const pageSizeParam = Array.isArray(searchParams.pageSize) ? searchParams.pageSize[0] : searchParams.pageSize;
  const sortByParam = Array.isArray(searchParams.sortBy) ? searchParams.sortBy[0] : searchParams.sortBy;
  const sortOrderParam = Array.isArray(searchParams.sortOrder) ? searchParams.sortOrder[0] : searchParams.sortOrder;
  const searchParam = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search;
  const tierIdParam = Array.isArray(searchParams.tierId) ? searchParams.tierId[0] : searchParams.tierId;

  // Convert to appropriate types
  const page = pageParam ? parseInt(pageParam) : 1;
  const pageSize = pageSizeParam ? parseInt(pageSizeParam) : 10;
  const sortBy = sortByParam || 'created_at';
  const sortOrder = (sortOrderParam as 'asc' | 'desc') || 'desc';
  const search = searchParam || '';
  const tierId = tierIdParam;

  // Fetch tier information if tierId is provided
  let tierInfo = null;
  if (tierId) {
    const { data: tierData } = await supabase
      .from('membership_tiers')
      .select(`
        *,
        products (
          id,
          name,
          price,
          currency,
          is_active
        )
      `)
      .eq('id', tierId)
      .single();
    
    if (tierData) {
      // Create a serializable tier info object
      tierInfo = {
        id: tierData.id,
        name: tierData.name,
        type: tierData.type,
        description: tierData.description,
        requiresReview: tierData.requires_review,
        requiresForm: tierData.requires_form,
        products: tierData.products?.map((product: any) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          currency: product.currency,
          isActive: product.is_active
        })) || [],
        createdAt: tierData.created_at,
        updatedAt: tierData.updated_at
      };
    }
  }

  // Calculate pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Get payments for a specific tier or all payments
  let payments = [];
  let count = 0;
  let error = null;

  if (tierId) {
    try {
      // Step 1: Find products associated with this tier
      const { data: tierProducts } = await supabase
        .from('products')
        .select('id')
        .eq('membership_tier_id', tierId);
      
      if (!tierProducts || tierProducts.length === 0) {
        console.log('No products found for tier ID:', tierId);
        // Return empty results rather than error
        payments = [];
        count = 0;
      } else {
        // Step 2: Find orders with these products through suborders
        const productIds = tierProducts.map(product => product.id);
        
        const { data: suborders } = await supabase
          .from('suborders')
          .select('order_id')
          .in('product_id', productIds);
        
        if (!suborders || suborders.length === 0) {
          console.log('No orders found for tier products');
          // Return empty results rather than error
          payments = [];
          count = 0;
        } else {
          // Step 3: Get unique order IDs
          const orderIds = [...new Set(suborders.map(so => so.order_id))];
          
          // Step 4: Finally get payments for these orders
          let query = supabase
            .from('payments')
            .select(`
              *,
              stripe_payments(*),
              manual_payments(*),
              payment_uploads(
                upload:uploads(*)
              ),
              orders(*)
            `, { count: 'exact' })
            .eq('group_id', org.id)
            .in('order_id', orderIds);
          
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
            
          const { data: tierPayments, error: tierError, count: tierCount } = await query;
          
          payments = tierPayments || [];
          count = tierCount || 0;
          error = tierError;
        }
      }
    } catch (err) {
      console.error('Error fetching tier payments:', err);
      error = err as any;
    }
  } else {
    // For all payments
    let query = supabase
      .from('payments')
      .select(`
        *,
        stripe_payments(*),
        manual_payments(*),
        payment_uploads(
          upload:uploads(*)
        ),
        orders(*)
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
    
    const { data: allPayments, error: allError, count: allCount } = await query;
    
    payments = allPayments || [];
    count = allCount || 0;
    error = allError;
  }

  if (error) {
    console.error('Error fetching payments:', error);
    return <div>Error loading payments: {error?.message || 'Unknown error'}</div>;
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
      tierId={tierId}
      tierName={tierInfo?.name}
      tierInfo={tierInfo}
    />
  );
}

export default withOrgAccess(PaymentsPage, {
  permissions: [permissions.payments.view],
  onAccessDenied: {
    action: 'error',
  }
}); 