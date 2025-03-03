import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useXenditForm } from "@/hooks/use-xendit-form";
import { formatCurrency } from "@/lib/utils";
import { useEffect } from "react";

interface XenditPaymentFormProps {
  clientSecret?: string;
  orderId: string;
  orgId: string;
  amount: number;
  currency: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export function XenditPaymentForm({
  orderId,
  orgId,
  amount,
  currency,
  onSuccess,
  onError
}: XenditPaymentFormProps) {
  const { isLoading, checkoutUrl, error, initPayment } = useXenditForm();

  useEffect(() => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  }, [checkoutUrl]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handlePay = async () => {
    await initPayment({
      orderId,
      orgId,
      amount,
      currency
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-sm text-muted-foreground">Preparing Xendit payment...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-medium">Total Amount</div>
        <div className="font-bold">{formatCurrency(amount)}</div>
      </div>

      <Button
        onClick={handlePay}
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : "Pay with Xendit"}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
} 