'use client';

import { Button } from "@/components/ui/button";
import { Check, Loader2, X } from "lucide-react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { handleApproveApplication, handleRejectApplication } from "../_actions/applications";
import { permissions } from "@/lib/types/permissions";
import { MembershipActivationType } from "@/lib/types/membership";

interface ApplicationActionsProps {
  applicationId: string;
  status: string;
  activationType: string;
  price?: number; // Price in cents
  userPermissions?: string[];
  className?: string;
  size?: "default" | "sm";
}

export function ApplicationActions({ 
  applicationId, 
  status, 
  activationType,
  price = 0,
  userPermissions = [], 
  className = "",
  size = "default"
}: ApplicationActionsProps) {
  const [approveState, approveDispatch, approveLoading] = useToastActionState(handleApproveApplication);
  const [rejectState, rejectDispatch, rejectLoading] = useToastActionState(handleRejectApplication);

  const canApprove = userPermissions.includes(permissions.applications.approve);
  const canReject = userPermissions.includes(permissions.applications.reject);

  const handleApprove = () => {
    const formData = new FormData();
    formData.append('id', applicationId);
    approveDispatch(formData);
  };

  const handleReject = () => {
    const formData = new FormData();
    formData.append('id', applicationId);
    rejectDispatch(formData);
  };

  if (!canApprove && !canReject) return null;
  if (status !== 'pending') return null;

  // Get appropriate approve button text based on activation type and price
  const getApproveButtonText = () => {
    if (approveLoading) return 'Approving...';

    // For paid memberships (price is in cents)
    if (price > 0) {
      switch (activationType) {
        case MembershipActivationType.REVIEW_THEN_PAYMENT:
          return 'Approve for Payment';
        case MembershipActivationType.FORM_THEN_REVIEW:
          return 'Approve for Payment';
        case MembershipActivationType.PAYMENT_REQUIRED:
        case MembershipActivationType.FORM_THEN_PAYMENT:
          return 'Request Payment';
        case MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW:
          return 'Approve & Request Payment';
        default:
          return 'Approve';
      }
    }

    // For free memberships
    switch (activationType) {
      case MembershipActivationType.FORM_THEN_REVIEW:
      case MembershipActivationType.REVIEW_REQUIRED:
        return 'Approve Membership';
      default:
        return 'Approve';
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {canApprove && (
        <Button
          variant="default"
          size={size}
          className="flex-1"
          onClick={handleApprove}
          disabled={approveLoading || rejectLoading}
        >
          { approveLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" /> }
          { getApproveButtonText() }
        </Button>
      )}
      {canReject && (
        <Button
          variant="destructive"
          size={size}
          className="flex-1"
          onClick={handleReject}
          disabled={approveLoading || rejectLoading}
        >
          { rejectLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" /> }
          { rejectLoading ? 'Rejecting...' : 'Reject' }
        </Button>
      )}
    </div>
  );
} 