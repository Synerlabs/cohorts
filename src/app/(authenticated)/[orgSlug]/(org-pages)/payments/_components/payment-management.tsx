'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FileIcon, ImageIcon, ExternalLinkIcon, ArrowUpDown, Trash2Icon, FileTextIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon, CheckIcon, XIcon, Eye } from 'lucide-react';
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
import { Trash2 } from "lucide-react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { approvePaymentAction, rejectPaymentAction, deletePaymentAction } from "@/app/(authenticated)/[orgSlug]/(org-pages)/payments/actions/payment.action";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

interface FilePreviewProps {
  file: {
    originalFilename: string;
    fileUrl: string;
  };
}

function FilePreview({ file }: FilePreviewProps) {
  const isImage = file.originalFilename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  
  return (
    <a
      href={file.fileUrl}
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
        {file.originalFilename}
      </span>
      <ExternalLinkIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
    </a>
  );
}

interface Payment {
  id: string;
  orderId: string;
  userId: string;
  type: 'manual' | 'stripe';
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  uploads: Array<{
    id: string;
    module: string;
    originalFilename: string;
    storagePath: string;
    storageProvider: string;
    fileUrl: string;
    fileId?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  order?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    product: {
      id: string;
      name: string;
      description?: string;
      price: number;
      currency: string;
      type: string;
    };
  };
}

interface PaymentManagementProps {
  orgId: string;
  userId: string;
  initialPayments: Payment[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  sorting?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  search?: string;
}

function PaginationControls({ pagination, onPageChange }: { 
  pagination: NonNullable<PaymentManagementProps['pagination']>;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">
        Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} payments
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PaymentManagement({ 
  orgId, 
  userId, 
  initialPayments,
  pagination,
  sorting,
  search
}: PaymentManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reviewPaymentId = searchParams.get('reviewPaymentId');
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState(search || '');
  const [state, approveAction, approvePending] = useToastActionState(approvePaymentAction);
  const [, rejectAction, rejectPending] = useToastActionState(rejectPaymentAction);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [, deleteAction] = useToastActionState(deletePaymentAction);
  const [sortBy, setSortBy] = useState(sorting?.sortBy || 'createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(sorting?.sortOrder || 'desc');

  useEffect(() => {
    if (reviewPaymentId) {
      const payment = initialPayments.find(p => p.id === reviewPaymentId);
      if (payment) {
        setSelectedPayment(payment);
      }
    } else {
      setSelectedPayment(null);
      setNotes('');
    }
  }, [reviewPaymentId, initialPayments]);

  const handleOpenReview = (payment: Payment) => {
    const params = new URLSearchParams(searchParams);
    params.set('reviewPaymentId', payment.id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCloseReview = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('reviewPaymentId');
    router.push(`${pathname}?${params.toString()}`);
    setNotes('');
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
      toast({
        title: "Notes Required",
        description: "Please provide notes explaining why the payment is being rejected.",
        variant: "destructive",
      });
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    params.set('page', '1'); // Reset to first page on new search
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDelete = async (payment: Payment) => {
    await deleteAction({ success: false }, {
      paymentId: payment.id,
      orgId,
    });
    setPaymentToDelete(null);
    router.refresh();
  };

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams);
    const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    params.set('sortBy', column);
    params.set('sortOrder', newOrder);
    router.push(`${pathname}?${params.toString()}`);
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortOrder === 'asc' ? 
      <ChevronLeftIcon className="ml-2 h-4 w-4 rotate-90" /> : 
      <ChevronLeftIcon className="ml-2 h-4 w-4 -rotate-90" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Search payments..."
            className="w-[300px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        {pagination && (
          <PaginationControls 
            pagination={pagination} 
            onPageChange={handlePageChange}
          />
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="w-[180px] cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center">
                  Date
                  {getSortIcon('createdAt')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center">
                  Type
                  {getSortIcon('type')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center">
                  Amount
                  {getSortIcon('amount')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  {getSortIcon('status')}
                </div>
              </TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No payments found.
                </TableCell>
              </TableRow>
            ) : (
              initialPayments.map((payment) => (
                <TableRow key={payment.id} className="group">
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
                    <div className="flex flex-col">
                      <span className="capitalize">{payment.type}</span>
                      {payment.order?.product && (
                        <span className="text-sm text-muted-foreground">
                          {payment.order.product.name} - {(payment.order.product.price / 100).toLocaleString(undefined, {
                            style: 'currency',
                            currency: payment.order.product.currency || payment.currency
                          })}
                        </span>
                      )}
                    </div>
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
                    <div className="flex items-center justify-end gap-2">
                      {payment.status === 'pending' ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenReview(payment)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Review</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(payment)}
                            disabled={approvePending}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                          >
                            <CheckIcon className="h-4 w-4" />
                            <span className="sr-only">Approve</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(payment)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <XIcon className="h-4 w-4" />
                            <span className="sr-only">Reject</span>
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenReview(payment)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPaymentToDelete(payment)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2Icon className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex justify-end">
          <PaginationControls 
            pagination={pagination} 
            onPageChange={handlePageChange}
          />
        </div>
      )}

      <Dialog open={!!selectedPayment} onOpenChange={() => handleCloseReview()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Payment</DialogTitle>
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

              {selectedPayment.order?.product && (
                <div className="rounded-lg border border-gray-100 p-4 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Details</label>
                  <div className="space-y-1">
                    <div className="font-medium">{selectedPayment.order.product.name}</div>
                    <div className="text-sm text-gray-500">
                      {(selectedPayment.order.product.price / 100).toLocaleString(undefined, {
                        style: 'currency',
                        currency: selectedPayment.order.product.currency || selectedPayment.currency
                      })}
                    </div>
                    {selectedPayment.order.product.description && (
                      <div className="text-sm text-gray-500">
                        {selectedPayment.order.product.description}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedPayment.type === 'manual' && selectedPayment.uploads && selectedPayment.uploads.length > 0 && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileTextIcon className="h-5 w-5 text-gray-500" />
                    <label className="font-medium text-gray-900">Proof of Payment</label>
                  </div>
                  <div className="space-y-2 divide-y divide-gray-100">
                    {selectedPayment.uploads.map((upload) => (
                      <div key={upload.id} className="pt-2 first:pt-0">
                        <FilePreview file={upload} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <Textarea
                  className="mt-1"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this payment..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleCloseReview}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedPayment)}
                  disabled={!notes || rejectPending}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedPayment)}
                  disabled={approvePending}
                >
                  Approve
                </Button>
              </div>
            </div>
          )}
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
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPaymentToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => paymentToDelete && handleDelete(paymentToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 