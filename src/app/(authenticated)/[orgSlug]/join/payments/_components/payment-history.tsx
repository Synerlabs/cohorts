'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FileIcon, ImageIcon, ExternalLinkIcon, FileTextIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Payment, Upload } from '@/services/payment/types';

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

interface PaymentHistoryProps {
  orderId: string;
  initialPayments: Payment[];
}

export function PaymentHistory({ orderId, initialPayments }: PaymentHistoryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reviewPaymentId = searchParams.get('reviewPaymentId');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

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
  };

  const handleCloseReview = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('reviewPaymentId');
    router.push(`${pathname}?${params.toString()}`);
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialPayments.map((payment) => (
            <TableRow 
              key={payment.id} 
              className="group hover:bg-muted/50 cursor-pointer"
              onClick={() => handleOpenReview(payment)}
            >
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
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!selectedPayment} onOpenChange={() => handleCloseReview()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <div className="mt-1 text-lg font-semibold">
                  {(selectedPayment.amount / 100).toLocaleString(undefined, {
                    style: 'currency',
                    currency: selectedPayment.currency
                  })}
                </div>
              </div>
              {selectedPayment.order?.product && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product</label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedPayment.order.product.name}</div>
                    <div className="text-sm text-gray-500">
                      {(selectedPayment.order.product.price / 100).toLocaleString(undefined, {
                        style: 'currency',
                        currency: selectedPayment.order.product.currency || selectedPayment.currency
                      })}
                    </div>
                  </div>
                </div>
              )}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 
