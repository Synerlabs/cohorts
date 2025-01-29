import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { notFound } from "next/navigation";
import { OrderDetails } from "./_components/order-details";
import { SubordersTable } from "./_components/suborders-table";

interface OrderDetailsPageProps extends OrgAccessHOCProps {
  params: {
    orderId: string;
  };
}

async function OrderDetailsPage({ org, user, params }: OrderDetailsPageProps) {
  if (!user) {
    return <div>Not authenticated</div>;
  }

  const { orderId } = params;

  // Initialize supabase client
  const supabase = await createServiceRoleClient();

  // Fetch order details
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      suborders(
        *,
        product:products(*)
      )
    `)
    .eq('id', orderId)
    .eq('group_id', org.id)
    .single();

  if (error || !order) {
    console.error('Error fetching order:', error);
    notFound();
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order Details</h1>
        <div className="flex items-center space-x-4">
          {/* Add action buttons here if needed */}
        </div>
      </div>

      <OrderDetails order={order} />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Suborders</h2>
        <SubordersTable suborders={order.suborders} />
      </div>
    </div>
  );
}

export default withOrgAccess(OrderDetailsPage); 