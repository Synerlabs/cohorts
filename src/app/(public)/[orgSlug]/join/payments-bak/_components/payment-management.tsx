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
  approvePaymentAction,
  rejectPaymentAction,
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
import { toast } from "@/components/ui/use-toast";
import { formatAmount } from '@/lib/utils/currency';

interface PaymentRecord {
  id: string;
  type: 'manual' | 'stripe';
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface PaymentManagementProps {
  payments: PaymentRecord[];
}

export function PaymentManagement({ payments = [] }: PaymentManagementProps) {
  // Transform raw payments data if needed
  const transformedPayments = payments.map(payment => ({
    id: payment.id,
    type: payment.type,
    amount: typeof payment.amount === 'string' ? parseInt(payment.amount, 10) : payment.amount,
    currency: payment.currency,
    status: payment.status,
    created_at: payment.created_at
  }));

  if (!transformedPayments || transformedPayments.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No payment history available.
      </div>
    );
  }

  return (
    <div className="divide-y">
      {transformedPayments.map((payment) => (
        <div key={payment.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{payment.type === 'manual' ? 'Manual Payment' : 'Card Payment'}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(payment.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatAmount(payment.amount, payment.currency)}</p>
              <p className="text-sm text-muted-foreground capitalize">{payment.status}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 