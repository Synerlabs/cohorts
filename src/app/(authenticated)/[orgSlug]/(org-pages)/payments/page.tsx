import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { PaymentManagement } from "./_components/payment-management";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { createStorageProvider } from "@/services/storage/storage-settings.service";
import { PaymentServiceFactory } from "@/services/payment/payment.service.factory";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, ClockIcon } from "lucide-react";

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

  // Calculate payment statistics
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const approvedAmount = payments
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <div className="text-sm text-muted-foreground">
          Organization: <span className="font-medium text-foreground">{org.name}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <ArrowUpIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved Payments</p>
                <h3 className="text-2xl font-bold">
                  {(approvedAmount / 100).toLocaleString(undefined, {
                    style: 'currency',
                    currency: org.currency || 'USD'
                  })}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                <h3 className="text-2xl font-bold">
                  {(pendingAmount / 100).toLocaleString(undefined, {
                    style: 'currency',
                    currency: org.currency || 'USD'
                  })}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {pendingPayments.length} payment{pendingPayments.length !== 1 ? 's' : ''} pending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <ArrowDownIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Payments</p>
                <h3 className="text-2xl font-bold">
                  {(totalAmount / 100).toLocaleString(undefined, {
                    style: 'currency',
                    currency: org.currency || 'USD'
                  })}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {total} total payment{total !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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