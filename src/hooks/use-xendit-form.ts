import { useState } from 'react';

interface XenditPaymentParams {
  orderId: string;
  orgId: string;
  amount: number;
  currency: string;
  successUrl?: string;
  failureUrl?: string;
  customerName?: string;
  customerEmail?: string;
}

export function useXenditForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  async function initPayment(params: XenditPaymentParams) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/xendit/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: params.orderId,
          orgId: params.orgId,
          amount: params.amount,
          currency: params.currency,
          successUrl: params.successUrl || window.location.origin + '/payment/success',
          failureUrl: params.failureUrl || window.location.origin + '/payment/failure',
          customerName: params.customerName,
          customerEmail: params.customerEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create Xendit payment');
      }

      const data = await response.json();
      setCheckoutUrl(data.invoiceUrl);
    } catch (err: any) {
      console.error('Error creating Xendit payment:', err);
      setError(err.message || 'Failed to create Xendit payment');
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    error,
    checkoutUrl,
    initPayment,
  };
} 