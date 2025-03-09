'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

interface PaymentSubmitButtonProps {
  amount: number;
  currency: string;
  formId: string;
  disabled?: boolean;
}

export function PaymentSubmitButton({ amount, currency, formId, disabled = false }: PaymentSubmitButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleClick = () => {
    // We'll use the traditional HTML form submission approach
    const form = document.getElementById(formId) as HTMLFormElement;
    if (form) {
      setIsSubmitting(true);
      form.submit();
    }
  };
  
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount / 100);
  
  return (
    <Button 
      type="button" 
      className="w-full" 
      size="lg"
      onClick={handleClick}
      disabled={disabled || isSubmitting}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        `Complete Payment (${formattedAmount})`
      )}
    </Button>
  );
} 