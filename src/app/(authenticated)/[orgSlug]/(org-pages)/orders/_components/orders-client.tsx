import { useRouter } from "next/navigation";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Order {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  completed_at: string | null;
  suborders: Array<{
    id: string;
    status: string;
    amount: number;
    currency: string;
    product: {
      id: string;
      name: string;
      type: string;
    };
  }>;
}

interface OrdersClientProps {
  org: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    email: string;
  };
  orders: Order[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  sorting: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  search: string;
}

export function OrdersClient({
  org,
  user,
  orders,
  pagination,
  sorting,
  search,
}: OrdersClientProps) {
  const router = useRouter();
  const [state, toastAction] = useToastActionState(async () => {}, null);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100); // Assuming amount is in cents
  };

  const columns = [
    {
      accessorKey: "id",
      header: "Order ID",
      cell: ({ row }: { row: { getValue: (key: string) => any } }) => {
        const id = row.getValue("id") as string;
        return <span className="font-mono text-xs">{id}</span>;
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }: { row: { getValue: (key: string) => any } }) => {
        const type = row.getValue("type") as string;
        return <Badge variant="outline" className="capitalize">{type}</Badge>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: { getValue: (key: string) => any } }) => {
        const status = row.getValue("status") as string;
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: { row: { getValue: (key: string) => any; original: Order } }) => {
        const amount = row.getValue("amount") as number;
        const currency = row.original.currency;
        return formatCurrency(amount, currency);
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }: { row: { getValue: (key: string) => any } }) => {
        const date = row.getValue("created_at") as string;
        return format(new Date(date), "MMM d, yyyy");
      },
    },
    {
      accessorKey: "completed_at",
      header: "Completed",
      cell: ({ row }: { row: { getValue: (key: string) => any } }) => {
        const date = row.getValue("completed_at") as string | null;
        return date ? format(new Date(date), "MMM d, yyyy") : "-";
      },
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: Order } }) => {
        const order = row.original;
        return (
          <Button
            variant="ghost"
            onClick={() => {
              router.push(`/${org.slug}/orders/${order.id}`);
            }}
          >
            View Details
          </Button>
        );
      },
    },
  ];

  const handleSearch = (value: string) => {
    const params = new URLSearchParams();
    if (value) params.set("search", value);
    if (sorting.sortBy) params.set("sortBy", sorting.sortBy);
    if (sorting.sortOrder) params.set("sortOrder", sorting.sortOrder);
    if (pagination.page > 1) params.set("page", pagination.page.toString());
    if (pagination.pageSize !== 10)
      params.set("pageSize", pagination.pageSize.toString());

    router.push(`/${org.slug}/orders?${params.toString()}`);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex gap-4">
          <Input
            placeholder="Search orders..."
            className="w-[300px]"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        pagination={{
          pageIndex: pagination.page - 1,
          pageSize: pagination.pageSize,
          pageCount: pagination.totalPages,
          total: pagination.total,
        }}
        sorting={{
          sortBy: sorting.sortBy,
          sortOrder: sorting.sortOrder,
        }}
        onPaginationChange={(updatedPagination: { pageIndex: number; pageSize: number }) => {
          const params = new URLSearchParams();
          if (search) params.set("search", search);
          if (sorting.sortBy) params.set("sortBy", sorting.sortBy);
          if (sorting.sortOrder) params.set("sortOrder", sorting.sortOrder);
          if (updatedPagination.pageIndex > 0)
            params.set("page", (updatedPagination.pageIndex + 1).toString());
          if (updatedPagination.pageSize !== 10)
            params.set("pageSize", updatedPagination.pageSize.toString());

          router.push(`/${org.slug}/orders?${params.toString()}`);
        }}
        onSortingChange={(updatedSorting: { sortBy: string; sortOrder: 'asc' | 'desc' }) => {
          const params = new URLSearchParams();
          if (search) params.set("search", search);
          if (updatedSorting.sortBy)
            params.set("sortBy", updatedSorting.sortBy);
          if (updatedSorting.sortOrder)
            params.set("sortOrder", updatedSorting.sortOrder);
          if (pagination.page > 1)
            params.set("page", pagination.page.toString());
          if (pagination.pageSize !== 10)
            params.set("pageSize", pagination.pageSize.toString());

          router.push(`/${org.slug}/orders?${params.toString()}`);
        }}
      />
    </div>
  );
} 
