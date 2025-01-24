'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { useRouter } from 'next/navigation';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';
import { FileIcon, ImageIcon, ExternalLinkIcon } from 'lucide-react';

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

export function PaymentManagement({ orgId, userId, initialPayments }: PaymentManagementProps) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [notes, setNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  const [, approvePayment] = useToastActionState(approvePaymentAction, undefined, undefined, {
    successTitle: 'Payment Approved',
    successDescription: 'The payment has been approved successfully',
  });

  const [, rejectPayment] = useToastActionState(rejectPaymentAction, undefined, undefined, {
    successTitle: 'Payment Rejected',
    successDescription: 'The payment has been rejected',
  });

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

  // Keep local state in sync with props
  useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
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
      </CardContent>
    </Card>
  );
} 