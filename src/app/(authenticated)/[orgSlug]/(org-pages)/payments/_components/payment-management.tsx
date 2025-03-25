'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FileIcon, ImageIcon, ExternalLinkIcon, ArrowUpDown, Trash2Icon, FileTextIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon, CheckIcon, XIcon, Eye, ClockIcon } from 'lucide-react';
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
import { Payment as PaymentType } from "@/services/payment/types";
import Link from "next/link";
import { format, parseISO } from "date-fns";

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

export interface PaymentManagementProps {
  orgId: string;
  orgSlug: string;
  userId: string;
  initialPayments: PaymentType[];
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
  tierId?: string;
  tierName?: string;
  tierInfo?: {
    id: string;
    name: string;
    type: string;
    description?: string;
    requiresReview: boolean;
    requiresForm: boolean;
    products: Array<{
      id: string;
      name: string;
      price: number;
      currency: string;
      isActive: boolean;
    }>;
    createdAt: string;
    updatedAt: string;
  } | null;
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

// Format currency consistently
function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100);
}

// Payment status badge component
function PaymentStatusBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
        <CheckIcon className="h-3 w-3 mr-1" /> Paid
      </Badge>
    );
  } else if (status === 'rejected') {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">
        <XIcon className="h-3 w-3 mr-1" /> Rejected
      </Badge>
    );
  } else if (status === 'pending_approval') {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">
        <ClockIcon className="h-3 w-3 mr-1" /> Pending Review
      </Badge>
    );
  } else {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">
        <ClockIcon className="h-3 w-3 mr-1" /> Pending
      </Badge>
    );
  }
}

// Format date from PostgreSQL timestamp or ISO string
function formatPaymentDate(date: string) {
  try {
    // Handle PostgreSQL timestamp format
    const dateStr = date.includes('+') 
      ? date.split('+')[0].trim() // PostgreSQL format
      : date; // ISO format
    return format(parseISO(dateStr), "MMM d, yyyy 'at' HH:mm 'UTC'");
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return date; // Return original if parsing fails
  }
}

export function PaymentManagement({ 
  orgId,
  orgSlug,
  userId,
  initialPayments,
  pagination,
  sorting,
  search,
  tierId,
  tierName,
  tierInfo
}: PaymentManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reviewPaymentId = searchParams.get('reviewPaymentId');
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<PaymentType | null>(null);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState(search || '');
  const [state, approveAction, approvePending] = useToastActionState(approvePaymentAction);
  const [, rejectAction, rejectPending] = useToastActionState(rejectPaymentAction);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentType | null>(null);
  const [, deleteAction] = useToastActionState(deletePaymentAction);
  const [sortBy, setSortBy] = useState(sorting?.sortBy || 'createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(sorting?.sortOrder || 'desc');
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleOpenReview = (payment: PaymentType) => {
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

  const handleApprove = async (payment: PaymentType) => {
    const formData = new FormData();
    formData.append('paymentId', payment.id);
    formData.append('orgId', orgId);
    formData.append('notes', notes);
    await approveAction(formData);
    handleCloseReview();
    router.refresh();
  };

  const handleReject = async (payment: PaymentType) => {
    if (!notes) {
      toast({
        title: "Notes Required",
        description: "Please provide notes explaining why the payment is being rejected.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('paymentId', payment.id);
    formData.append('orgId', orgId);
    formData.append('notes', notes);
    await rejectAction(formData);
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

  const handleDelete = async (payment: PaymentType) => {
    const formData = new FormData();
    formData.append('paymentId', payment.id);
    formData.append('orgId', orgId);
    if (payment.type === 'manual') {
      formData.append('deleteFiles', String(deleteFiles));
    }
    await deleteAction(formData);
    setPaymentToDelete(null);
    setDeleteFiles(true);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex w-full sm:w-auto items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={tierId 
                ? `Search ${tierName || 'tier'} payments...`
                : "Search payments..."}
              className="w-full sm:w-[300px] pl-9 pr-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="shrink-0">
            Search
          </Button>
        </form>
        {pagination && (
          <PaginationControls 
            pagination={pagination} 
            onPageChange={handlePageChange}
          />
        )}
      </div>

      <Card className={`border-muted/60 overflow-hidden ${tierId ? 'border-primary/10 bg-primary/[0.01]' : ''}`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className={`${tierId ? 'bg-primary/5' : 'bg-muted/50'}`}>
              <TableRow>
                <TableHead 
                  className="w-[180px] cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center">
                    Date
                    {getSortIcon('createdAt')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center">
                    Payment Details
                    {getSortIcon('type')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center">
                    Amount
                    {getSortIcon('amount')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/70 transition-colors w-[140px]"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    {getSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead className="w-[70px] text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FileIcon className="h-10 w-10 mb-2 text-muted-foreground/50" />
                      <p>No payments found</p>
                      <p className="text-sm">
                        {tierId 
                          ? `No payments found for this membership tier${tierName ? `: ${tierName}` : ''}`
                          : "Try adjusting your search or filters"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                initialPayments.map((payment) => (
                  <TableRow 
                    key={payment.id} 
                    className="group hover:bg-muted/30 transition-colors"
                    onClick={() => router.push(`/@${orgSlug}/payments/${payment.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{formatPaymentDate(payment.createdAt || (payment as any).created_at || '').split(' at ')[0]}</span>
                        <span className="text-xs text-muted-foreground">{formatPaymentDate(payment.createdAt || (payment as any).created_at || '').split(' at ')[1]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="capitalize font-medium">{payment.type}</span>
                          {payment.id && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {payment.id.split('-')[0]}...
                            </span>
                          )}
                        </div>
                        {payment.order?.product && (
                          <span className="text-sm text-muted-foreground truncate max-w-[220px] block">
                            {payment.order.product.name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      <div className="flex flex-col">
                        <span>{formatCurrency(payment.amount, payment.currency)}</span>
                        <span className="text-xs text-muted-foreground uppercase">{payment.currency}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReview(payment);
                        }}
                        aria-label="View payment details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

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
                    {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedPayment.status === 'paid' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
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
                      {formatCurrency(selectedPayment.order.product.price, selectedPayment.order.product.currency || selectedPayment.currency)}
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