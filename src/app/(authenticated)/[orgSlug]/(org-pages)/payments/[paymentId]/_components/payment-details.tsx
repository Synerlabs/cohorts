'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileIcon, ImageIcon, ExternalLinkIcon, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { Payment } from "@/services/payment/types";
import { approvePaymentAction, rejectPaymentAction, type PaymentFormState } from "../../actions/payment.action";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { OrgAccessHOCProps } from "@/lib/hoc/org";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { Check, X } from "lucide-react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { permissions } from "@/lib/types/permissions";

type Organization = OrgAccessHOCProps['org'];

interface PaymentDetailsProps {
  payment: any; // Temporarily use any to fix type issues
  org: Organization;
  user: any;
  userPermissions: string[];
}

function FilePreview({ file }: { file: { originalFilename: string; fileUrl: string } }) {
  if (!file?.originalFilename) return null;
  
  const isImage = file.originalFilename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  
  return (
    <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 transition-colors group">
      {isImage ? (
        <ImageIcon className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
      ) : (
        <FileIcon className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
      )}
      <a
        href={file.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 group"
      >
        <span className="text-sm text-blue-600 group-hover:text-blue-700 hover:underline truncate">
          {file.originalFilename}
        </span>
      </a>
      <ExternalLinkIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
    </div>
  );
}

const wrapApproveAction = async (prevState: any, formData: FormData) => {
  const payload = {
    paymentId: formData.get('paymentId') as string,
    orgId: formData.get('orgId') as string,
    notes: formData.get('notes') as string
  };
  return approvePaymentAction(prevState, payload);
};

const wrapRejectAction = async (prevState: any, formData: FormData) => {
  const payload = {
    paymentId: formData.get('paymentId') as string,
    orgId: formData.get('orgId') as string,
    notes: formData.get('notes') as string
  };
  return rejectPaymentAction(prevState, payload);
};

export default function PaymentDetails({ payment, org, user, userPermissions }: PaymentDetailsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { hasPermission } = usePermissions(userPermissions);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [dialogNotes, setDialogNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [mounted, setMounted] = useState(false);

  const [approveState, approvePayment, isApproving] = useToastActionState(wrapApproveAction);
  const [rejectState, rejectPayment, isRejecting] = useToastActionState(wrapRejectAction);

  const canProcess = hasPermission([permissions.payments.process]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleApproveClick = () => {
    setIsApproveDialogOpen(true);
  };

  const handleRejectClick = () => {
    setIsRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    const formData = new FormData();
    formData.append('paymentId', payment.id);
    formData.append('orgId', org.id);
    formData.append('notes', dialogNotes);
    
    await approvePayment(formData);
    setIsApproveDialogOpen(false);
    setNotes("");
    setDialogNotes("");
    router.refresh();
  };

  const handleReject = async () => {
    const formData = new FormData();
    formData.append('paymentId', payment.id);
    formData.append('orgId', org.id);
    formData.append('notes', dialogNotes);
    
    await rejectPayment(formData);
    setIsRejectDialogOpen(false);
    setNotes("");
    setDialogNotes("");
    router.refresh();
  };

  // Format currency consistently
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  // Format date consistently
  const formatDate = (date: string) => {
    // Use a fixed string format for both server and client
    const d = new Date(date);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[d.getUTCMonth()];
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();
    const hours = d.getUTCHours().toString().padStart(2, '0');
    const minutes = d.getUTCMinutes().toString().padStart(2, '0');
    
    return `${month} ${day}, ${year} at ${hours}:${minutes} UTC`;
  };

  return (
    <div className="container max-w-4xl py-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-6">
          <Link href={`/@${org.slug}/payments`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Payments
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Payment Overview */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <div className="mt-1 text-lg font-semibold">
                  {formatCurrency(payment.amount, payment.currency)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    payment.status === 'paid' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
                    payment.status === 'rejected' ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20' :
                    'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <div className="mt-1">
                  {formatDate(payment.created_at)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <div className="mt-1 capitalize">{payment.type}</div>
              </div>
            </div>
          </CardContent>
          {payment.status === 'pending' && canProcess && (
            <CardFooter className="border-t pt-6 flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={handleRejectClick}
                disabled={isRejecting}
                className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApproveClick}
                disabled={isApproving}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Payment Type Specific Details */}
        {payment.type === 'stripe' && payment.stripe_payments && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Stripe Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Intent ID</label>
                  <div className="mt-1 font-mono text-sm">
                    {payment.stripe_payments.stripe_payment_intent_id}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stripe Status</label>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {payment.stripe_payments.stripe_status}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {payment.type === 'manual' && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Manual Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {payment.payment_uploads && payment.payment_uploads.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proof of Payment
                    </label>
                    <div className="rounded-lg border border-gray-200 divide-y">
                      {payment.payment_uploads.map((pu: any) => (
                        <FilePreview 
                          key={pu.upload.id} 
                          file={{
                            originalFilename: pu.upload.original_filename,
                            fileUrl: pu.upload.file_url
                          }} 
                        />
                      ))}
                    </div>
                  </div>
                )}
                {payment.manual_payments?.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                      {payment.manual_payments.notes}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        {payment.orders && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order ID</label>
                  <div className="mt-1 font-mono text-sm">{payment.orders.id}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      payment.orders.status === 'completed' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
                      payment.orders.status === 'failed' ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20' :
                      'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                    }`}>
                      {payment.orders.status}
                    </span>
                  </div>
                </div>
                {payment.orders.suborders?.[0]?.product && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product</label>
                    <div className="mt-2 rounded-lg border border-gray-100 p-4 bg-gray-50">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {payment.orders.suborders[0].product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(
                            payment.orders.suborders[0].product.price,
                            payment.orders.suborders[0].product.currency || payment.currency
                          )}
                        </div>
                        {payment.orders.suborders[0].product.description && (
                          <div className="text-sm text-gray-500">
                            {payment.orders.suborders[0].product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approve Dialog */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm that you want to approve this payment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="approve-notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="approve-notes"
              value={dialogNotes}
              onChange={(e) => setDialogNotes(e.target.value)}
              placeholder="Add notes about this approval..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isApproving}
              onClick={() => {
                setDialogNotes(notes);
                setIsApproveDialogOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isApproving || !dialogNotes.trim()}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {isApproving ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm that you want to reject this payment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="reject-notes"
              value={dialogNotes}
              onChange={(e) => setDialogNotes(e.target.value)}
              placeholder="Add notes about this rejection..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isRejecting}
              onClick={() => {
                setDialogNotes(notes);
                setIsRejectDialogOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isRejecting || !dialogNotes.trim()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {isRejecting ? "Rejecting..." : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 
