'use client';

import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, ClockIcon, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";
import { StripeSettingsForm } from "./stripe-settings-form";
import { Icons } from "@/components/icons";
import { PaymentManagement, Payment } from "./payment-management";

interface PaymentGateway {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Icons;
  isConfigured?: boolean;
}

interface PaymentsClientProps {
  org: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    email: string;
  };
  payments: Payment[];
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

const paymentGateways: PaymentGateway[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments via Stripe Connect',
    icon: 'stripe',
  },
  {
    id: 'manual',
    name: 'Manual',
    description: 'Manually mark payments as completed',
    icon: 'wallet',
  }
];

export function PaymentsClient({ org, user, payments, pagination, sorting, search }: PaymentsClientProps) {
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);

  // Calculate payment statistics
  const totalAmount = payments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
  const pendingPayments = payments.filter((p: Payment) => p.status === 'pending');
  const pendingAmount = pendingPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
  const approvedAmount = payments
    .filter((p: Payment) => p.status === 'approved')
    .reduce((sum: number, p: Payment) => sum + p.amount, 0);

  function renderGatewaySettings(gateway: PaymentGateway) {
    switch (gateway.id) {
      case 'stripe':
        return <StripeSettingsForm orgId={org.id} />;
      case 'manual':
        return <div>Manual payment settings</div>;
      default:
        return null;
    }
  }
  
  return (
    <>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Payments</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Organization: <span className="font-medium text-foreground">{org.name}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedGateway(paymentGateways[0])}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Payment Settings
            </Button>
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
                      currency: 'USD'
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
                      currency: 'USD'
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
                      currency: 'USD'
                    })}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pagination.total} total payment{pagination.total !== 1 ? 's' : ''}
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
          pagination={pagination}
          sorting={sorting}
          search={search}
        />
      </div>

      <Sheet 
        open={selectedGateway !== null}
        onOpenChange={(open) => !open && setSelectedGateway(null)}
      >
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {selectedGateway?.name} Settings
            </SheetTitle>
          </SheetHeader>
          {selectedGateway && renderGatewaySettings(selectedGateway)}
        </SheetContent>
      </Sheet>
    </>
  );
} 
