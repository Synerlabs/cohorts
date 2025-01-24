'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Payment, Upload } from '@/services/payment/types';
import {
  approvePaymentAction,
  rejectPaymentAction,
} from '../actions/payment.action';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';
import { FileIcon, ImageIcon, ExternalLinkIcon, ArrowUpDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { debounce } from 'lodash';

interface PaymentManagementProps {
  orgId: string;
  userId: string;
  initialPayments: Payment[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  sorting: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  search: string;
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
  pagination,
  sorting,
  search: initialSearch
}: PaymentManagementProps) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [notes, setNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [, approvePayment] = useToastActionState(approvePaymentAction, undefined, undefined, {
    successTitle: 'Payment Approved',
    successDescription: 'The payment has been approved successfully',
  });

  const [, rejectPayment] = useToastActionState(rejectPaymentAction, undefined, undefined, {
    successTitle: 'Payment Rejected',
    successDescription: 'The payment has been rejected',
  });

  // Keep local state in sync with props
  useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);

  const updateSearchParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSort = (field: string) => {
    const newOrder = field === sorting.sortBy && sorting.sortOrder === 'asc' ? 'desc' : 'asc';
    updateSearchParams({ sortBy: field, sortOrder: newOrder });
  };

  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: newPage.toString() });
  };

  const handlePageSizeChange = (newSize: string) => {
    updateSearchParams({ pageSize: newSize, page: '1' });
  };

  const debouncedSearch = debounce((value: string) => {
    updateSearchParams({ search: value, page: '1' });
  }, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleApprove = async (payment: Payment) => {
    await approvePayment({ success: false }, {
      paymentId: payment.id,
      orgId,
      notes,
    });
    setIsDialogOpen(false);
    router.refresh();
  };

  const handleReject = async (payment: Payment) => {
    if (!notes) {
      return;
    }

    await rejectPayment({ success: false }, {
      paymentId: payment.id,
      orgId,
      notes,
    });
    setIsDialogOpen(false);
    router.refresh();
  };

  const renderPaymentProof = (payment: Payment) => {
    if (payment.type === 'manual' && payment.uploads.length > 0) {
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

  const renderSortIcon = (field: string) => {
    if (field !== sorting.sortBy) {
      return <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return (
      <ArrowUpDown 
        className={`h-4 w-4 ${sorting.sortOrder === 'asc' ? 'rotate-180' : ''}`} 
      />
    );
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>Payment History</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Input
                placeholder="Search payments..."
                value={search}
                onChange={handleSearchChange}
                className="w-64 pl-9"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('created_at')}
                >
                  Date {renderSortIcon('created_at')}
                </div>
              </TableHead>
              <TableHead>
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('type')}
                >
                  Type {renderSortIcon('type')}
                </div>
              </TableHead>
              <TableHead>
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  Amount {renderSortIcon('amount')}
                </div>
              </TableHead>
              <TableHead>
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('status')}
                >
                  Status {renderSortIcon('status')}
                </div>
              </TableHead>
              <TableHead className="w-[300px]">Proof/Details</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
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
                    <p className="text-muted-foreground/60">Try adjusting your search or filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
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
                  <TableCell>{renderPaymentProof(payment)}</TableCell>
                  <TableCell className="text-right">
                    {payment.status === 'pending' && (
                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setNotes('');
                            }}
                          >
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Review Payment</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                              <Card>
                                <CardContent className="p-4">
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Details</h4>
                                  <dl className="space-y-2">
                                    <div>
                                      <dt className="text-sm text-gray-500">Amount</dt>
                                      <dd className="text-lg font-medium">
                                        {(payment.amount / 100).toLocaleString(undefined, {
                                          style: 'currency',
                                          currency: payment.currency
                                        })}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-sm text-gray-500">Date</dt>
                                      <dd className="font-medium">
                                        {payment.createdAt.toLocaleDateString(undefined, {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric'
                                        })}
                                      </dd>
                                    </div>
                                  </dl>
                                </CardContent>
                              </Card>

                              {payment.uploads.length > 0 && (
                                <Card>
                                  <CardContent className="p-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Proof of Payment</h4>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                      {payment.uploads.map((upload) => (
                                        <FilePreview key={upload.id} upload={upload} />
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                                Review Notes
                              </label>
                              <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add notes about this payment..."
                                className="min-h-[100px]"
                              />
                            </div>

                            <div className="flex justify-end gap-3">
                              <Button
                                variant="outline"
                                onClick={() => selectedPayment && handleReject(selectedPayment)}
                                disabled={!notes}
                              >
                                Reject Payment
                              </Button>
                              <Button
                                onClick={() => selectedPayment && handleApprove(selectedPayment)}
                              >
                                Approve Payment
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="px-4 py-3 border-t">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} payments
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="h-8 px-4"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="h-8 px-4"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 