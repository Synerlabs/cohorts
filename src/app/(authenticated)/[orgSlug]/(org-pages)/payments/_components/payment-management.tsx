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
      className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 transition-colors"
    >
      {isImage ? (
        <ImageIcon className="h-4 w-4 text-gray-500" />
      ) : (
        <FileIcon className="h-4 w-4 text-gray-500" />
      )}
      <span className="text-sm text-blue-600 hover:underline flex-1 truncate">
        {upload.originalFilename}
      </span>
      <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
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
        <div className="space-y-1">
          {payment.uploads.map((upload) => (
            <FilePreview key={upload.id} upload={upload} />
          ))}
        </div>
      );
    }
    if (payment.type === 'stripe') {
      return 'Stripe Payment';
    }
    return 'No proof attached';
  };

  const renderSortIcon = (field: string) => {
    if (field !== sorting.sortBy) return <ArrowUpDown className="h-4 w-4" />;
    return (
      <ArrowUpDown 
        className={`h-4 w-4 ${sorting.sortOrder === 'asc' ? 'rotate-180' : ''}`} 
      />
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Payments</CardTitle>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search payments..."
              value={search}
              onChange={handleSearchChange}
              className="w-64"
            />
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-32">
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort('created_at')} className="cursor-pointer">
                Date {renderSortIcon('created_at')}
              </TableHead>
              <TableHead onClick={() => handleSort('type')} className="cursor-pointer">
                Type {renderSortIcon('type')}
              </TableHead>
              <TableHead onClick={() => handleSort('amount')} className="cursor-pointer">
                Amount {renderSortIcon('amount')}
              </TableHead>
              <TableHead onClick={() => handleSort('status')} className="cursor-pointer">
                Status {renderSortIcon('status')}
              </TableHead>
              <TableHead className="w-1/3">Proof/Details</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.createdAt.toLocaleDateString()}</TableCell>
                <TableCell className="capitalize">{payment.type}</TableCell>
                <TableCell>
                  {(payment.amount / 100).toLocaleString(undefined, {
                    style: 'currency',
                    currency: payment.currency
                  })}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                    payment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {payment.status}
                  </span>
                </TableCell>
                <TableCell>{renderPaymentProof(payment)}</TableCell>
                <TableCell>
                  {payment.status === 'pending' && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
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
                        <div className="space-y-4">
                          <div className="border rounded-lg p-4 space-y-2">
                            <h3 className="text-sm font-medium text-gray-700">Payment Details</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Amount:</span>{' '}
                                {(payment.amount / 100).toLocaleString(undefined, {
                                  style: 'currency',
                                  currency: payment.currency
                                })}
                              </div>
                              <div>
                                <span className="text-gray-500">Date:</span>{' '}
                                {payment.createdAt.toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          {payment.uploads.length > 0 && (
                            <div className="border rounded-lg p-4 space-y-2">
                              <h3 className="text-sm font-medium text-gray-700">Proof of Payment</h3>
                              <div className="space-y-2">
                                {payment.uploads.map((upload) => (
                                  <FilePreview key={upload.id} upload={upload} />
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium text-gray-700">Notes</label>
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Add notes about this payment..."
                              className="mt-1"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => selectedPayment && handleReject(selectedPayment)}
                              disabled={!notes}
                            >
                              Reject
                            </Button>
                            <Button
                              onClick={() => selectedPayment && handleApprove(selectedPayment)}
                            >
                              Approve
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} payments
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 