'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Payment as BasePayment, Upload } from '@/services/payment/types';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FileIcon, ImageIcon, ExternalLinkIcon, ArrowUpDown, Trash2Icon, FileTextIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogContent,
  Dialog,
} from "@/components/ui/dialog";
import { FilePreview } from "@/components/file-preview";
import { Trash2 } from "lucide-react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { approvePaymentAction, rejectPaymentAction, deletePaymentAction } from "@/app/(authenticated)/[orgSlug]/(org-pages)/payments/actions/payment.action";

interface Payment extends BasePayment {
  notes?: string;
}

interface PaymentManagementProps {
  orgId: string;
  userId: string;
  initialPayments: Payment[];
}

function FilePreview({ upload }: { upload: Upload }) {
  const isImage = upload.originalFilename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  
  return (
    <a
      href={upload.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 transition-colors group"
    >
      {isImage ? (
        <ImageIcon className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
      ) : (
        <FileIcon className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
      )}
      <span className="text-sm text-blue-600 group-hover:text-blue-700 hover:underline flex-1 truncate">
        {upload.originalFilename}
      </span>
      <ExternalLinkIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
    </a>
  );
}

export function PaymentManagement({ 
  orgId, 
  userId, 
  initialPayments,
}: PaymentManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reviewPaymentId = searchParams.get('reviewPaymentId');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(true);
  const [notes, setNotes] = useState('');
  const [state, approveAction, approvePending] = useToastActionState(approvePaymentAction);
  const [, rejectAction, rejectPending] = useToastActionState(rejectPaymentAction);
  const [, deleteAction] = useToastActionState(deletePaymentAction);

  useEffect(() => {
    if (reviewPaymentId) {
      const payment = initialPayments.find(p => p.id === reviewPaymentId);
      if (payment) {
        setSelectedPayment(payment);
      }
    } else {
      setSelectedPayment(null);
    }
  }, [reviewPaymentId, initialPayments]);

  const handleOpenReview = (payment: Payment) => {
    const params = new URLSearchParams(searchParams);
    params.set('reviewPaymentId', payment.id);
    router.push(`${pathname}?${params.toString()}`);
    setNotes('');
  };

  const handleCloseReview = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('reviewPaymentId');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleApprove = async (payment: Payment) => {
    await approveAction({ success: false }, {
      paymentId: payment.id,
      orgId,
      notes,
    });
    handleCloseReview();
    router.refresh();
  };

  const handleReject = async (payment: Payment) => {
    if (!notes) {
      return;
    }

    await rejectAction({ success: false }, {
      paymentId: payment.id,
      orgId,
      notes,
    });
    handleCloseReview();
    router.refresh();
  };

  const handleDelete = async (payment: Payment) => {
    await deleteAction({ success: false }, {
      paymentId: payment.id,
      orgId,
      deleteFiles: payment.type === 'manual' ? deleteFiles : false,
    });
    setPaymentToDelete(null);
    setDeleteFiles(true);
    router.refresh();
  };

  const renderPaymentProof = (payment: Payment) => {
    if (payment.type === 'manual' && payment.uploads?.length > 0) {
      return (
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {payment.uploads.map((upload) => (
            <FilePreview key={upload.id} upload={upload} />
          ))}
        </div>
      );
    }
    if (payment.type === 'stripe') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <svg className="h-3.5 w-3.5" viewBox="0 0 32 32" role="presentation" fill="currentColor">
            <path d="M29.3 16.1c0-1.5-0.7-2.7-2.1-2.7h-3.2c-0.3 0-0.6 0.3-0.6 0.6v7.5c0 0.3 0.3 0.6 0.6 0.6h3.2c1.4 0 2.1-1.2 2.1-2.7v-3.3zM25.2 20.5h-0.3v-5.6h0.3c0.8 0 1.2 0.7 1.2 1.7v2.2c0 1-0.4 1.7-1.2 1.7zM18.7 13.4c-0.3 0-0.6 0.3-0.6 0.6v7.5c0 0.3 0.3 0.6 0.6 0.6h1.8v-8.7h-1.8zM14.1 13.4c-0.3 0-0.6 0.3-0.6 0.6v7.5c0 0.3 0.3 0.6 0.6 0.6h1.8v-8.7h-1.8zM9.5 17.3l-1.2-3.6c-0.1-0.3-0.3-0.4-0.6-0.4h-1.8v8.7h1.8v-3.6l1.2 3.6c0.1 0.3 0.3 0.4 0.6 0.4h1.8v-8.7h-1.8v3.6z"></path>
          </svg>
          Stripe Payment
        </span>
      );
    }
    return (
      <span className="text-sm text-gray-500 italic">
        No proof attached
      </span>
    );
  };

  return (
    <div className="divide-y">
      {initialPayments.map((payment) => (
        <div key={payment.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {(payment.amount / 100).toLocaleString(undefined, {
                    style: 'currency',
                    currency: payment.currency
                  })}
                </span>
                <Badge variant={
                  payment.status === 'approved' ? 'outline' :
                  payment.status === 'rejected' ? 'destructive' :
                  'default'
                }>
                  {payment.status}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(payment.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {payment.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenReview(payment)}
                >
                  Review
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPaymentToDelete(payment)}
              >
                <Trash2Icon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {renderPaymentProof(payment)}
          {payment.notes && (
            <div className="mt-2 text-sm text-muted-foreground">
              {payment.notes}
            </div>
          )}
        </div>
      ))}

      <Dialog open={!!selectedPayment} onOpenChange={() => handleCloseReview()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedPayment && (
              <>
                <Card>
                  <CardContent className="pt-6 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Amount</div>
                      <div className="font-medium mt-1">
                        {(selectedPayment.amount / 100).toLocaleString(undefined, {
                          style: 'currency',
                          currency: selectedPayment.currency
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="font-medium mt-1 capitalize">{selectedPayment.status}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Date</div>
                      <div className="font-medium mt-1">
                        {new Date(selectedPayment.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Type</div>
                      <div className="font-medium mt-1 capitalize">{selectedPayment.type}</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Review Notes
                    <span className="text-destructive ml-1">*</span>
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this payment..."
                    className="min-h-[120px]"
                  />
                  <p className="text-[0.8rem] text-muted-foreground">
                    Required for rejecting payments
                  </p>
                </div>

                {selectedPayment.uploads?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-4">
                      <h4 className="text-sm font-medium">Proof of Payment</h4>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {selectedPayment.uploads.map((upload) => (
                          <FilePreview key={upload.id} upload={upload} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => selectedPayment && handleReject(selectedPayment)}
              disabled={!notes || rejectPending}
            >
              {rejectPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Rejecting...
                </>
              ) : (
                'Reject Payment'
              )}
            </Button>
            <Button
              onClick={() => selectedPayment && handleApprove(selectedPayment)}
              disabled={approvePending}
            >
              {approvePending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Approving...
                </>
              ) : (
                'Approve Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {paymentToDelete?.type === 'manual' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="delete-files"
                checked={deleteFiles}
                onCheckedChange={(checked) => setDeleteFiles(checked as boolean)}
              />
              <label
                htmlFor="delete-files"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Also delete uploaded files
              </label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => paymentToDelete && handleDelete(paymentToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 