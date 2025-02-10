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
import { Check, X, CreditCard } from "lucide-react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { handleApproveApplication, handleRejectApplication } from "../_actions/applications";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { ComponentPermission } from "@/components/ComponentPermission";
import { permissions } from "@/lib/types/permissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getActivationTypeBadgeVariant, getApplicationStatusBadgeVariant } from "@/lib/utils/badges";
import { formatPrice } from "@/lib/utils/price";

interface ApplicationsTableProps {
  applications: Application[];
  showActions?: boolean;
  userPermissions?: string[];
}

type ActionResult = {
  success?: boolean;
  error?: string;
  id?: string;
};

const activationTypeLabels = {
  'automatic': 'Automatic',
  'review_required': 'Review Required',
  'payment_required': 'Payment Required',
  'review_then_payment': 'Review then Payment'
} as const;

export function ApplicationsTable({ applications, showActions = true, userPermissions = [] }: ApplicationsTableProps) {
  const router = useRouter();
  const [approveState, approveDispatch] = useToastActionState(handleApproveApplication);
  const [rejectState, rejectDispatch] = useToastActionState(handleRejectApplication);

  const canApprove = userPermissions.includes(permissions.applications.approve);
  const canReject = userPermissions.includes(permissions.applications.reject);

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
              onClick={() => router.push(`applications/${application.id}`)}
            >
              <TableCell>
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
              </TableCell>
              <TableCell>
                {application.product.name}
              </TableCell>
              <TableCell>
                {formatPrice(application.product.price, application.product.currency)}
              </TableCell>
              <TableCell>
                <Badge variant={getActivationTypeBadgeVariant(application.product.membership_tier.activation_type)}>
                  {activationTypeLabels[application.product.membership_tier.activation_type as keyof typeof activationTypeLabels]}
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
                  className="text-right space-x-2"
                  onClick={(e) => e.stopPropagation()} // Prevent row click when clicking actions
                >
                  {canApprove && application.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const formData = new FormData();
                        formData.append('id', application.id);
                        approveDispatch(formData);
                      }}
                      disabled={Boolean(approveState?.success === false || approveState?.error)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {canReject && application.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const formData = new FormData();
                        formData.append('id', application.id);
                        rejectDispatch(formData);
                      }}
                      disabled={Boolean(rejectState?.success === false || rejectState?.error)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {application.status === 'pending_payment' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/@${application.group.slug}/join/payments?applicationId=${application.id}`)}
                    >
                      <CreditCard className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 