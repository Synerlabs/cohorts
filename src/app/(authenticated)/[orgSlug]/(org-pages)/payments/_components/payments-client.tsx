'use client';

import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, ClockIcon, Settings2, ChevronLeftIcon } from "lucide-react";
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
import { PaymentManagement } from "./payment-management";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Payment } from "@/services/payment/types";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

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
  tierId?: string;
  tierName?: string;
  tierInfo?: {
    id: string;
    name: string;
    type: string;
    description?: string;
    requiresReview: boolean;
    requiresForm: boolean;
    products: Array<{
      id: string;
      name: string;
      price: number;
      currency: string;
      isActive: boolean;
    }>;
    createdAt: string;
    updatedAt: string;
  } | null;
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

export function PaymentsClient({ 
  org, 
  user, 
  payments, 
  pagination, 
  sorting, 
  search,
  tierId,
  tierName,
  tierInfo
}: PaymentsClientProps) {
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'paid' | 'rejected'>('all');
  const router = useRouter();

  // Calculate totals
  const approvedPayments = payments.filter(p => p.status === 'paid');
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const pendingApprovalPayments = payments.filter(p => p.status === 'pending_approval');
  const rejectedPayments = payments.filter(p => p.status === 'rejected');

  const totalApproved = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPendingApproval = pendingApprovalPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalRejected = rejectedPayments.reduce((sum, p) => sum + p.amount, 0);

  // Handle filtering based on active tab
  const getFilteredPayments = () => {
    switch (activeTab) {
      case 'pending':
        return pendingPayments.concat(pendingApprovalPayments);
      case 'paid':
        return approvedPayments;
      case 'rejected':
        return rejectedPayments;
      default:
        return payments;
    }
  };

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
      <div className="container py-6 space-y-8">
        {/* Header section with improved styles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
          <div>
            {tierId ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="px-2 h-8"
                    onClick={() => router.push(`/@${org.slug}/payments`)}
                  >
                    <ChevronLeftIcon className="h-4 w-4 mr-1" />
                    All Payments
                  </Button>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-sm font-medium">Tier Payments</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <span>{tierInfo?.name || tierName || 'Tier'} Payments</span>
                  <Badge variant="outline" className="ml-2 text-primary border-primary/30 bg-primary/5">
                    Filtered
                  </Badge>
                  {tierInfo?.type && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {tierInfo.type === 'membership' ? 'Individual' : 'Organization'}
                    </Badge>
                  )}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {tierInfo?.description || `Viewing payments for membership tier${tierInfo?.name ? `: ${tierInfo.name}` : ''}`}
                </p>
                
                {/* Tier Details Card */}
                {tierInfo && (
                  <div className="mt-4 bg-muted/30 p-3 rounded-md border text-sm">
                    <div className="flex flex-wrap gap-4">
                      {tierInfo.products?.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Products:</span>{' '}
                          <span className="font-medium">{tierInfo.products.length}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Type:</span>{' '}
                        <span className="font-medium capitalize">{tierInfo.type}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Requires Form:</span>{' '}
                        <span className="font-medium">{tierInfo.requiresForm ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Requires Review:</span>{' '}
                        <span className="font-medium">{tierInfo.requiresReview ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
                <p className="text-muted-foreground mt-1">Manage and track all payment transactions</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm bg-slate-50 px-3 py-1.5 rounded-md border">
              <span className="text-muted-foreground">Organization:</span> <span className="font-medium text-foreground">{org.name}</span>
            </div>
            {!tierId && (
              <Button 
                variant="outline" 
                size="sm"
                asChild
                className="h-9 gap-1.5 transition-all hover:border-primary/50 hover:text-primary"
              >
                <Link href={`/@${org.slug}/settings/payment-gateways`}>
                  <Settings2 className="h-4 w-4" />
                  <span>Payment Settings</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Payment summary cards with enhanced design */}
        <div className={`grid gap-5 sm:grid-cols-2 ${tierId ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
          <Card className={`overflow-hidden border-slate-200 hover:shadow-md transition-all group ${tierId ? 'bg-gradient-to-tr from-green-50 to-white' : ''}`}>
            <div className="absolute top-0 right-0 h-20 w-20 bg-green-100 rounded-bl-full opacity-70 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                  <ArrowUpIcon className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Approved Payments
                    <Badge variant="outline" className="text-xs text-green-600 bg-green-50 hover:bg-green-100">
                      {approvedPayments.length}
                    </Badge>
                  </p>
                  <h3 className="text-2xl font-bold mt-1 group-hover:text-green-700 transition-colors">
                    {(totalApproved / 100).toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD'
                    })}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`overflow-hidden border-slate-200 hover:shadow-md transition-all group relative ${tierId ? 'bg-gradient-to-tr from-amber-50 to-white' : ''}`}>
            <div className="absolute top-0 right-0 h-20 w-20 bg-amber-100 rounded-bl-full opacity-70 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-full group-hover:bg-amber-200 transition-colors">
                  <ClockIcon className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Pending Payments
                    <Badge variant="outline" className="text-xs text-amber-600 bg-amber-50 hover:bg-amber-100">
                      {pendingPayments.length}
                    </Badge>
                  </p>
                  <h3 className="text-2xl font-bold mt-1 group-hover:text-amber-700 transition-colors">
                    {(totalPending / 100).toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD'
                    })}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`overflow-hidden border-slate-200 hover:shadow-md transition-all group relative ${tierId ? 'bg-gradient-to-tr from-blue-50 to-white' : ''}`}>
            <div className="absolute top-0 right-0 h-20 w-20 bg-blue-100 rounded-bl-full opacity-70 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                  <ClockIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Awaiting Review
                    <Badge variant="outline" className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100">
                      {pendingApprovalPayments.length}
                    </Badge>
                  </p>
                  <h3 className="text-2xl font-bold mt-1 group-hover:text-blue-700 transition-colors">
                    {(totalPendingApproval / 100).toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD'
                    })}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>

          {!tierId && (
            <Card className="overflow-hidden border-slate-200 hover:shadow-md transition-all group relative">
              <div className="absolute top-0 right-0 h-20 w-20 bg-red-100 rounded-bl-full opacity-70 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                    <ArrowDownIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      Rejected
                      <Badge variant="outline" className="text-xs text-red-600 bg-red-50 hover:bg-red-100">
                        {rejectedPayments.length}
                      </Badge>
                    </p>
                    <h3 className="text-2xl font-bold mt-1 group-hover:text-red-700 transition-colors">
                      {(totalRejected / 100).toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'USD'
                      })}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mt-2 mb-4">
          <Button 
            variant={activeTab === 'all' ? "default" : "outline"} 
            size="sm" 
            className="rounded-full"
            onClick={() => setActiveTab('all')}
          >
            All Payments
          </Button>
          <Button 
            variant={activeTab === 'pending' ? "default" : "outline"} 
            size="sm" 
            className={`rounded-full ${activeTab === 'pending' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-200 text-amber-700 hover:bg-amber-50'}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending
          </Button>
          <Button 
            variant={activeTab === 'paid' ? "default" : "outline"} 
            size="sm" 
            className={`rounded-full ${activeTab === 'paid' ? 'bg-green-600 hover:bg-green-700' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
            onClick={() => setActiveTab('paid')}
          >
            Approved
          </Button>
          <Button 
            variant={activeTab === 'rejected' ? "default" : "outline"} 
            size="sm" 
            className={`rounded-full ${activeTab === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'border-red-200 text-red-700 hover:bg-red-50'}`}
            onClick={() => setActiveTab('rejected')}
          >
            Rejected
          </Button>
        </div>

        <PaymentManagement 
          orgId={org.id} 
          orgSlug={org.slug}
          userId={user.id} 
          initialPayments={getFilteredPayments()}
          pagination={pagination}
          sorting={sorting}
          search={search}
          tierId={tierId}
          tierName={tierName}
          tierInfo={tierInfo}
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
