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
import { approveApplicationAction, rejectApplicationAction } from "../_actions/applications.action";
import { Badge } from "@/components/ui/badge";
import { MembershipActivationType } from "@/lib/types/membership";

interface ApplicationsTableProps {
  applications: Application[];
}

const activationTypeLabels = {
  [MembershipActivationType.AUTOMATIC]: 'Automatic',
  [MembershipActivationType.REVIEW_REQUIRED]: 'Review Required',
  [MembershipActivationType.PAYMENT_REQUIRED]: 'Payment Required',
  [MembershipActivationType.REVIEW_THEN_PAYMENT]: 'Review then Payment',
} as const;

export default function ApplicationsTable({ applications }: ApplicationsTableProps) {
  const [approveState, approveAction] = useToastActionState(approveApplicationAction, { success: false }, undefined, {
    successTitle: "Application Approved",
    successDescription: "The membership application has been approved successfully"
  });

  const [rejectState, rejectAction] = useToastActionState(rejectApplicationAction, { success: false }, undefined, {
    successTitle: "Application Rejected",
    successDescription: "The membership application has been rejected successfully"
  });

  if (!applications?.length) {
    return (
      <div className="text-center py-4 text-gray-500">
        No pending applications
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
            <TableHead className="text-right">Actions</TableHead>
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
                {application.is_active ? (
                  <Badge variant="outline">Active</Badge>
                ) : application.approved_at ? (
                  <Badge variant="secondary">Pending Payment</Badge>
                ) : (
                  <Badge variant="secondary">Pending Review</Badge>
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const formData = new FormData();
                    formData.append('id', application.id);
                    approveAction(formData);
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const formData = new FormData();
                    formData.append('id', application.id);
                    rejectAction(formData);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 