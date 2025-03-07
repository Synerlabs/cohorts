"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface XenditPaymentFormProps {
  order: any;
  orgId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  onProcessing: () => void;
}

export function XenditPaymentForm({
  order,
  orgId,
  onSuccess,
  onError,
  onProcessing
}: XenditPaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    onProcessing();

    try {
      // TODO: Implement Xendit payment processing
      // This is a placeholder for the actual Xendit integration
      await new Promise(resolve => setTimeout(resolve, 2000));
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6">
          {/* Xendit Elements will be mounted here */}
          <div className="min-h-[180px] rounded-md border bg-slate-50/50 p-4">
            <p className="text-sm text-muted-foreground text-center">
              Xendit payment form will be rendered here
            </p>
          </div>

          <Button
            type="submit"
            className="w-full mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: order.currency || 'USD'
              }).format(order.amount / 100)}`
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
} 