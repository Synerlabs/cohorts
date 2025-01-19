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
import { Check, X } from "lucide-react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { approveApplicationAction, rejectApplicationAction } from "../_actions/applications";
import { Badge } from "@/components/ui/badge";
import { MembershipActivationType } from "@/lib/types/membership";
import { useRouter } from "next/navigation";
import { ComponentPermission } from "@/components/ComponentPermission";
import { permissions } from "@/lib/types/permissions";

interface ApplicationsTableProps {
  applications: Application[];
  showActions?: boolean;
  userPermissions: string[];
}

const activationTypeLabels = {
  [MembershipActivationType.AUTOMATIC]: 'Automatic',
  [MembershipActivationType.REVIEW_REQUIRED]: 'Review Required',
  [MembershipActivationType.PAYMENT_REQUIRED]: 'Payment Required',
  [MembershipActivationType.REVIEW_THEN_PAYMENT]: 'Review then Payment',
} as const;

type ActionResult = {
  success: boolean;
  error?: string;
};

export default function ApplicationsTable({ applications, showActions = true, userPermissions }: ApplicationsTableProps) {
  const router = useRouter();
  const [approveState, approveAction] = useToastActionState<ActionResult>(approveApplicationAction, undefined, undefined, {
    successTitle: "Application Approved",
    successDescription: "The membership application has been approved successfully"
  });

  const [rejectState, rejectAction] = useToastActionState<ActionResult>(rejectApplicationAction, undefined, undefined, {
    successTitle: "Application Rejected",
    successDescription: "The membership application has been rejected successfully"
  });

  const handleApprove = async (applicationId: string) => {
    const formData = new FormData();
    formData.append('id', applicationId);
    await approveAction(formData);
    router.refresh();
  };

  const handleReject = async (applicationId: string) => {
    const formData = new FormData();
    formData.append('id', applicationId);
    await rejectAction(formData);
    router.refresh();
  };

  const hasPermission = (requiredPermissions: string[]) => {
    return userPermissions.some((permission) =>
      requiredPermissions.includes(permission)
    );
  };

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
            {showActions && (
              <TableHead className="text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id}>
              <TableCell>
                <div className="font-medium">{application.user.full_name}</div>
                <div className="text-sm text-muted-foreground">
                  {application.user.email}
                </div>
              </TableCell>
              <TableCell>
                {application.membership.name}
              </TableCell>
              <TableCell>
                {application.membership.price === 0 ? (
                  <Badge variant="secondary">Free</Badge>
                ) : (
                  <div>${application.membership.price}</div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {activationTypeLabels[application.membership.activation_type]}
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
              {showActions && (
                <TableCell className="text-right space-x-2">
                  {hasPermission([permissions.applications.approve]) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleApprove(application.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {hasPermission([permissions.applications.reject]) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReject(application.id)}
                    >
                      <X className="h-4 w-4" />
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