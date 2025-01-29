import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { notFound } from "next/navigation";
import { OrderDetails } from "./_components/order-details";
import { SubordersTable } from "./_components/suborders-table";
import { PaymentsTable } from "./_components/payments-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ISuborderData } from "@/lib/types/suborder";

interface OrderDetailsPageProps extends OrgAccessHOCProps {
  params: {
    orderId: string;
    slug: string;
  };
}

type PaymentStatus = "paid" | "pending" | "failed";

interface Payment {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  type: "stripe" | "manual" | "upload"
  created_at: string
}

interface OrderData {
  id: string
  group_id: string
  status: "completed" | "pending" | "processing" | "failed" | "cancelled"
  type: string
  amount: number
  currency: string
  created_at: string
  completed_at: string | null
  suborders: ISuborderData[]
  payments: Payment[]
}

async function OrderDetailsPage({ org, user, params }: OrderDetailsPageProps) {
  if (!user) {
    return <div>Not authenticated</div>;
  }

  const orderId = params.orderId;
  
  // Initialize supabase client
  const supabase = await createServiceRoleClient();

  // Fetch order details
  const { data: orderData, error } = await supabase
    .from('orders')
    .select(`
      *,
      suborders(
        *,
        product:products(
          id,
          name,
          description,
          type
        )
      ),
      payments(
        id,
        amount,
        currency,
        status,
        type,
        created_at
      )
    `)
    .eq('id', orderId)
    .eq('group_id', org.id)
    .single();

  if (error || !orderData) {
    console.error('Error fetching order:', error);
    notFound();
  }

  // Ensure payments is always an array
  const order: OrderData = {
    ...orderData,
    payments: orderData.payments || []
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order Details</h1>
        <div className="flex items-center space-x-4">
          {/* Add action buttons here if needed */}
        </div>
      </div>

      <OrderDetails order={order} />

      <Tabs defaultValue="suborders" className="w-full">
        <TabsList>
          <TabsTrigger value="suborders">
            Suborders ({order.suborders.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments ({order.payments.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="suborders" className="mt-6">
          <SubordersTable suborders={order.suborders} />
        </TabsContent>
        <TabsContent value="payments" className="mt-6">
          <PaymentsTable payments={order.payments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withOrgAccess(OrderDetailsPage); 
