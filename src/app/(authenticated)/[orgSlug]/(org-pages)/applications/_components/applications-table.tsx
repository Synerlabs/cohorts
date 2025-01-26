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

interface ApplicationsTableProps {
  applications: Application[];
  showActions?: boolean;
  userPermissions?: string[];
}

type ActionResult = {
  success?: boolean;
  error?: string;
};

const activationTypeLabels = {
  'automatic': 'Automatic',
  'review_required': 'Review Required',
  'payment_required': 'Payment Required',
  'review_then_payment': 'Review then Payment'
} as const;

const currencySymbols = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'CAD': 'C$',
  'AUD': 'A$'
} as const;

export function ApplicationsTable({ applications, showActions = true, userPermissions = [] }: ApplicationsTableProps) {
  const router = useRouter();
  const [approveState, approveDispatch] = useToastActionState<ActionResult>(handleApproveApplication);
  const [rejectState, rejectDispatch] = useToastActionState<ActionResult>(handleRejectApplication);

  const canApprove = userPermissions.includes(permissions.applications.approve);
  const canReject = userPermissions.includes(permissions.applications.reject);

  const getBadgeVariant = (activationType: string) => {
    switch (activationType) {
      case 'automatic':
        return 'default';
      case 'review_required':
        return 'secondary';
      case 'payment_required':
        return 'destructive';
      case 'review_then_payment':
        return 'outline';
      default:
        return 'default';
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const symbol = currencySymbols[currency as keyof typeof currencySymbols] || '$';
    return `${symbol}${(price / 100).toFixed(2)}`;
  };

  if (!applications?.length) {
    return (
      <div className="text-center py-4 text-gray-500">
        No applications found
      </div>
    );
  }

  console.log(applications);

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
            <TableRow key={application.id}>
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
                <Badge variant={getBadgeVariant(application.product.membership_tier.activation_type)}>
                  {activationTypeLabels[application.product.membership_tier.activation_type as keyof typeof activationTypeLabels]}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(application.created_at)}
              </TableCell>
              <TableCell>
                {application.rejected_at ? (
                  <Badge variant="destructive">Rejected</Badge>
                ) : application.status === 'pending_payment' ? (
                  <Badge variant="secondary">Pending Payment</Badge>
                ) : application.status === 'approved' ? (
                  <Badge variant="outline">Active</Badge>
                ) : (
                  <Badge variant="secondary">Pending Review</Badge>
                )}
              </TableCell>
              {showActions && (canApprove || canReject) && (
                <TableCell className="text-right space-x-2">
                  {canApprove && application.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => approveDispatch({ id: application.id })}
                      disabled={Boolean(approveState?.success === false || approveState?.error)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {canReject && application.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => rejectDispatch({ id: application.id })}
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