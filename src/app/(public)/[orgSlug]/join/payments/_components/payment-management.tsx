'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Payment, Upload } from '@/services/payment/types';
import {
  deletePaymentAction,
} from '../actions/payment.action';
import { useRouter } from 'next/navigation';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';
import { FileIcon, ImageIcon, ExternalLinkIcon, Trash2Icon, Eye, FileTextIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PaymentManagementProps {
  orgId: string;
  userId: string;
  orderId: string;
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
  orderId,
  initialPayments,
}: PaymentManagementProps) {
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  const router = useRouter();

  const [deleteState, deleteAction, deletePending] = useToastActionState(deletePaymentAction, undefined, undefined, {
    successTitle: 'Payment Deleted',
    successDescription: 'The payment request has been deleted',
  });

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

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialPayments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <div className="flex flex-col items-center justify-center gap-1 text-sm">
                  <svg
                    className="h-8 w-8 text-muted-foreground/60 mb-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <p className="text-muted-foreground font-medium">No payments found</p>
                  <p className="text-muted-foreground/60">Add a payment method to get started</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            initialPayments.map((payment) => (
              <TableRow key={payment.id} className="group hover:bg-muted/50">
                <TableCell className="font-medium">
                  {new Date(payment.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </TableCell>
                <TableCell>
                  <span className="capitalize">{payment.type}</span>
                </TableCell>
                <TableCell className="font-medium tabular-nums">
                  {(payment.amount / 100).toLocaleString(undefined, {
                    style: 'currency',
                    currency: payment.currency
                  })}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    payment.status === 'approved' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
                    payment.status === 'rejected' ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20' :
                    'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                  }`}>
                    {payment.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedPayment(payment)}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View Details</span>
                    </Button>
                    {payment.status === 'pending' && (
                      <AlertDialog open={paymentToDelete?.id === payment.id} onOpenChange={(open) => {
                        if (!open) {
                          setPaymentToDelete(null);
                          setDeleteFiles(true);
                        }
                      }}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setPaymentToDelete(payment)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Payment Request</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-4">
                              <p>Are you sure you want to delete this payment request?</p>
                              {payment.type === 'manual' && payment.uploads?.length > 0 && (
                                <div className="flex items-start space-x-2 pt-2">
                                  <div className="flex h-5 items-center">
                                    <input
                                      type="checkbox"
                                      checked={deleteFiles}
                                      onChange={(e) => setDeleteFiles(e.target.checked)}
                                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <label htmlFor="delete-files" className="text-sm font-medium text-destructive">
                                      Delete {payment.uploads.length} associated file{payment.uploads.length !== 1 ? 's' : ''}
                                    </label>
                                    <p className="text-[0.8rem] text-muted-foreground">
                                      If unchecked, files will remain in storage but won't be accessible
                                    </p>
                                  </div>
                                </div>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => paymentToDelete && handleDelete(paymentToDelete)}
                              disabled={deletePending}
                            >
                              {deletePending ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Deleting...
                                </>
                              ) : (
                                'Delete'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <div className="mt-1 text-lg font-semibold">
                    {(selectedPayment.amount / 100).toLocaleString(undefined, {
                      style: 'currency',
                      currency: selectedPayment.currency
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedPayment.status === 'approved' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
                      selectedPayment.status === 'rejected' ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20' :
                      'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                    }`}>
                      {selectedPayment.status}
                    </span>
                  </div>
                </div>
              </div>

              {selectedPayment.type === 'manual' && selectedPayment.uploads && selectedPayment.uploads.length > 0 && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileTextIcon className="h-5 w-5 text-gray-500" />
                    <label className="font-medium text-gray-900">Attached Files</label>
                  </div>
                  <div className="space-y-2 divide-y divide-gray-100">
                    {selectedPayment.uploads.map((upload) => (
                      <div key={upload.id} className="pt-2 first:pt-0">
                        <FilePreview upload={upload} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPayment.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <div className="mt-1 text-sm text-gray-600">
                    {selectedPayment.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 