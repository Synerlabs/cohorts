'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Application } from "@/services/applications.service";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { permissions } from "@/lib/types/permissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getActivationTypeBadgeVariant, getApplicationStatusBadgeVariant } from "@/lib/utils/badges";
import { formatPrice, CurrencyCode } from "@/lib/utils/price";
import { useCallback, useMemo } from "react";
import { ApplicationActions } from "./application-actions";

type ActivationType = 'automatic' | 'review_required' | 'payment_required' | 'review_then_payment';

const activationTypeLabels: Record<ActivationType, string> = {
  'automatic': 'Automatic',
  'review_required': 'Review Required',
  'payment_required': 'Payment Required',
  'review_then_payment': 'Review then Payment'
} as const;

interface ApplicationsTableProps {
  applications: Application[];
  showActions?: boolean;
  userPermissions?: string[];
}

export function ApplicationsTable({ applications, showActions = true, userPermissions = [] }: ApplicationsTableProps) {
  const router = useRouter();

  const canApprove = useMemo(() => 
    userPermissions.includes(permissions.applications.approve),
    [userPermissions]
  );
  
  const canReject = useMemo(() => 
    userPermissions.includes(permissions.applications.reject),
    [userPermissions]
  );

  const handleRowClick = useCallback((applicationId: string) => {
    router.push(`applications/${applicationId}`);
  }, [router]);

  const handlePaymentClick = useCallback((groupSlug: string, applicationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/@${groupSlug}/join/payments?applicationId=${applicationId}`);
  }, [router]);

  if (!applications?.length) {
    return (
      <div className="text-center py-4 text-gray-500">
        No applications found
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Membership</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Activation Type</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead>Status</TableHead>
            {showActions && (canApprove || canReject) && (
              <TableHead className="text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow 
              key={application.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(application.id)}
            >
              <TableCell>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {application.user.first_name?.[0]}
                        {application.user.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {application.user.full_name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {application.user.email}
                      </span>
                    </div>
                  </div>
                  {/* Approve/Reject buttons for small screens */}
                  {showActions && (
                    <div className="md:hidden" onClick={(e) => e.stopPropagation()}>
                      <ApplicationActions
                        applicationId={application.id}
                        status={application.status}
                        activationType={application.product.membership_tier.activation_type}
                        price={application.product.price}
                        userPermissions={userPermissions}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {application.product.name}
              </TableCell>
              <TableCell>
                {formatPrice(application.product.price, application.product.currency as CurrencyCode)}
              </TableCell>
              <TableCell>
                <Badge variant={getActivationTypeBadgeVariant(application.product.membership_tier.activation_type)}>
                  {activationTypeLabels[application.product.membership_tier.activation_type as ActivationType]}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(application.created_at)}
              </TableCell>
              <TableCell>
                {application.rejected_at ? (
                  <Badge variant={getApplicationStatusBadgeVariant('rejected')}>Rejected</Badge>
                ) : application.status === 'pending_payment' ? (
                  <Badge variant={getApplicationStatusBadgeVariant('pending_payment')}>Pending Payment</Badge>
                ) : application.status === 'approved' ? (
                  <Badge variant={getApplicationStatusBadgeVariant('approved')}>Active</Badge>
                ) : (
                  <Badge variant={getApplicationStatusBadgeVariant('pending')}>Pending Review</Badge>
                )}
              </TableCell>
              {showActions && (canApprove || canReject) && (
                <TableCell 
                  className="text-right hidden md:table-cell"
                  onClick={(e) => e.stopPropagation()} // Prevent row click when clicking actions
                >
                  <div className="flex justify-end">
                    <ApplicationActions
                      applicationId={application.id}
                      status={application.status}
                      activationType={application.product.membership_tier.activation_type}
                      price={application.product.price}
                      userPermissions={userPermissions}
                      size="sm"
                    />
                    {application.status === 'pending_payment' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handlePaymentClick(application.group.slug, application.id, e)}
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 