import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { OrderType, OrderStatus } from "@/lib/types/order";
import { permissions } from "@/lib/types/permissions";
import { ProductService } from "@/services/product.service";
import { OrderService } from "@/services/order.service";
import { getOrgMembers } from "@/services/org.service";
import OrderCreateForm from "./_components/order-create-form";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ChevronLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuborderData {
  productId: string;
  amount: number;
  currency: string;
  membershipIdOverride?: string;
  membershipStartDate?: string;
  membershipEndDate?: string;
}

interface CreateOrderParams {
  userId: string; // This is auth.users.id
  type: OrderType;
  amount: number;
  currency: string;
  groupId: string;
  suborders: SuborderData[];
}

async function createOrder(params: CreateOrderParams) {
  "use server";
  
  const supabase = await createServiceRoleClient();
  let groupUserIdToUse: string | undefined = undefined;

  // If it's a membership order, we need to find the group_user.id
  if (params.type === 'membership') {
    const { data: groupUserData, error: groupUserError } = await supabase
      .from('group_users')
      .select('id')
      .eq('user_id', params.userId) // params.userId is auth.users.id
      .eq('group_id', params.groupId)
      .single();

    if (groupUserError || !groupUserData) {
      console.error('Error fetching group_user_id for membership order:', groupUserError);
      return { success: false, error: "Failed to link user to group for membership." };
    }
    groupUserIdToUse = groupUserData.id;
  }
  
  try {
    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: params.userId,
        type: params.type,
        status: "pending",
        amount: params.amount,
        currency: params.currency,
        group_id: params.groupId
      })
      .select()
      .single();

    if (orderError) throw orderError;
    
    // Create all suborders
    const subordersData = params.suborders.map(suborder => {
      let metadata: any = {};
      if (params.type === 'membership') {
        metadata.group_user_id = groupUserIdToUse; 
        
        if (suborder.membershipIdOverride) {
          metadata.custom_membership_id = suborder.membershipIdOverride;
        }
        if (suborder.membershipStartDate) {
          metadata.start_date = suborder.membershipStartDate;
        }
        if (suborder.membershipEndDate) {
          metadata.end_date = suborder.membershipEndDate;
        }
      }

      return {
        order_id: order.id,
        type: params.type, // This should align with the product type for suborders, e.g. 'membership' for membership_tier products
        product_id: suborder.productId,
        amount: suborder.amount,
        currency: suborder.currency,
        status: "pending",
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };
    });
    
    const { error: suborderError } = await supabase
      .from("suborders")
      .insert(subordersData);

    if (suborderError) throw suborderError;
    
    revalidatePath("/orders");
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("Error creating order:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Standalone server action to be used by the client component
async function handleOrderSubmission(formData: FormData, groupId: string) {
  "use server";
  
  const userId = formData.get("userId") as string;
  const type = formData.get("type") as OrderType;
  const amount = parseInt(formData.get("amount") as string, 10);
  const currency = formData.get("currency") as string;
  const subordersJson = formData.get("subordersData") as string;
  
  // Parse the suborders data
  let suborders: SuborderData[] = [];
  try {
    suborders = JSON.parse(subordersJson);
  } catch (error) {
    console.error("Error parsing suborders data:", error);
    return { success: false, error: "Invalid suborders data" };
  }
  
  return await createOrder({
    userId,
    type,
    amount,
    currency,
    groupId,
    suborders,
  });
}

// Main page component - Use async directly here
async function OrderCreatePage(params: OrgAccessHOCProps) {
  const { org, user } = params;

  if (!user) {
    return <div>Not authenticated</div>;
  }

  // Get all the products for the org
  const supabase = await createServiceRoleClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("group_id", org.id)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching products:", error);
    return <div>Error loading products</div>;
  }

  // Get all users in the org
  console.log("Fetching users for org ID:", org.id);
  const userQuery = supabase
    .from("group_members_view")
    .select("id, user_id, first_name, last_name, email")
    .eq("group_id", org.id)
    .eq("is_active", true)
    .eq("is_deleted", false);
  
  const { data: groupUsers, error: groupUsersError } = await userQuery;
  
  console.log("User query result - count:", groupUsers?.length);
  console.log("User query error:", groupUsersError);
  
  if (groupUsersError) {
    console.error("Error fetching group users:", groupUsersError);
    return <div>Error loading users</div>;
  }

  // Transform the data to match the expected format
  const transformedUsers = groupUsers?.map((user: any) => ({
    id: user.id,
    user_id: user.user_id,
    user_data: {
      id: user.user_id,
      email: user.email,
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
    }
  })) || [];

  console.log("Transformed users count:", transformedUsers.length);
  if (transformedUsers.length > 0) {
    console.log("First user sample:", JSON.stringify(transformedUsers[0]));
  }

  // Create a bound version of the server action with the org ID already set
  const createOrderWithGroup = async (formData: FormData) => {
    "use server";
    
    const result = await handleOrderSubmission(formData, org.id);
    
    if (result.success) {
      redirect(`/${org.slug}/orders/${result.orderId}`);
    }
    
    return result;
  };

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Link href={`/${org.slug}/orders`} className="flex items-center hover:text-foreground">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Orders
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Create New Order</h1>
          </div>
          
          <p className="text-muted-foreground max-w-2xl">
            Create a new order by selecting a user and adding products. Order details will be automatically calculated based on the selected products.
          </p>
        </div>

        <OrderCreateForm 
          products={products || []} 
          users={transformedUsers} 
          createOrder={createOrderWithGroup}
        />
      </div>
    </div>
  );
}

// Export the page component wrapped with access control
export default withOrgAccess(OrderCreatePage, {
  permissions: [permissions.orders.view],
  onAccessDenied: {
    action: "error",
  }
}); 