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
import { Payment } from '@/services/payment.service';
import {
  approvePaymentAction,
  rejectPaymentAction,
  getPaymentsByOrgIdAction,
} from '../actions/payment.action';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';

interface PaymentManagementProps {
  orgId: string;
  userId: string;
  initialPayments: Payment[];
}

export function PaymentManagement({ orgId, userId, initialPayments }: PaymentManagementProps) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [notes, setNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [, approvePayment] = useToastActionState(approvePaymentAction, undefined, undefined, {
    successTitle: 'Payment Approved',
    successDescription: 'The payment has been approved successfully',
  });

  const [, rejectPayment] = useToastActionState(rejectPaymentAction, undefined, undefined, {
    successTitle: 'Payment Rejected',
    successDescription: 'The payment has been rejected',
  });

  const loadPayments = async () => {
    const result = await getPaymentsByOrgIdAction(null, { orgId });
    setPayments(result);
  };

  const handleApprove = async (payment: Payment) => {
    await approvePayment({ success: false }, {
      paymentId: payment.id,
      userId,
      notes,
    });
    setIsDialogOpen(false);
    loadPayments();
  };

  const handleReject = async (payment: Payment) => {
    if (!notes) {
      return;
    }

    await rejectPayment({ success: false }, {
      paymentId: payment.id,
      userId,
      notes,
    });
    setIsDialogOpen(false);
    loadPayments();
  };

  const renderPaymentProof = (payment: Payment) => {
    if (payment.type === 'manual' && payment.proofUrl) {
      return (
        <a
          href={payment.proofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          View Proof
        </a>
      );
    }
    if (payment.type === 'stripe') {
      return 'Stripe Payment';
    }
    return null;
  };

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
              <TableHead>Proof/Details</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.createdAt.toLocaleDateString()}</TableCell>
                <TableCell className="capitalize">{payment.type}</TableCell>
                <TableCell>
                  {payment.amount} {payment.currency}
                </TableCell>
                <TableCell className="capitalize">{payment.status}</TableCell>
                <TableCell>{renderPaymentProof(payment)}</TableCell>
                <TableCell>
                  {payment.status === 'pending' && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Review Payment</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Notes</label>
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Add notes about this payment..."
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => selectedPayment && handleReject(selectedPayment)}
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