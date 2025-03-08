"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// Define the payment status types
type PaymentStatus = 'checking' | 'verified' | 'failed';

export function PaymentVerification({ 
  orgSlug, 
  paymentIntentId
}: { 
  orgSlug: string;
  paymentIntentId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('checking');
  
  // Check payment status on mount
  useEffect(() => {
    let isMounted = true;
    let redirectTimer: ReturnType<typeof setTimeout>;
    
    // For simplicity in this implementation, we'll simulate the check with a delay
    // In a real implementation, you would use fetch() to check the payment status
    const timer = setTimeout(() => {
      if (!isMounted) return;
      
      // Always succeed in this demo
      setPaymentStatus('verified');
      
      // Show success toast
      toast({
        title: 'Payment Successful',
        description: 'Your payment has been processed successfully.',
      });
      
      // Redirect to dashboard after a delay
      redirectTimer = setTimeout(() => {
        if (isMounted) {
          router.push(`/@${orgSlug}/dashboard`);
        }
      }, 3000);
    }, 2000);
    
    // Cleanup function if component unmounts
    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [paymentIntentId, orgSlug, router, toast]);
  
  return (
    <div className="container max-w-5xl py-12">
      <Card className={cn(
        "shadow-md border-primary/20",
        paymentStatus === 'failed' && "border-destructive/20"
      )}>
        <CardContent className="pt-8 pb-6 px-6">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className={cn(
              "p-4 rounded-full",
              paymentStatus === 'checking' && "bg-primary/10",
              paymentStatus === 'verified' && "bg-primary/10",
              paymentStatus === 'failed' && "bg-destructive/10"
            )}>
              {paymentStatus === 'checking' ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              ) : paymentStatus === 'verified' ? (
                <CheckCircle2 className="h-8 w-8 text-primary" />
              ) : (
                <AlertCircle className="h-8 w-8 text-destructive" />
              )}
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">
                {paymentStatus === 'checking' && 'Verifying Payment'}
                {paymentStatus === 'verified' && 'Payment Verified'}
                {paymentStatus === 'failed' && 'Payment Verification Failed'}
              </h2>
              <p className="text-muted-foreground">
                {paymentStatus === 'checking' 
                  ? 'Your payment is being processed. Please wait while we confirm your payment status.'
                  : paymentStatus === 'verified'
                    ? 'Payment verification complete. Redirecting to your dashboard...'
                    : 'We could not verify your payment. Please contact support.'}
              </p>
              {paymentStatus === 'checking' && (
                <div className="h-2 w-full max-w-xs bg-muted rounded-full overflow-hidden mt-4 mx-auto">
                  <div className="h-2 bg-primary animate-pulse rounded-full"></div>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {paymentStatus === 'checking'
                ? 'This may take a few moments.'
                : paymentStatus === 'verified'
                  ? 'Thank you for your payment.'
                  : 'Please try again or contact customer support.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 