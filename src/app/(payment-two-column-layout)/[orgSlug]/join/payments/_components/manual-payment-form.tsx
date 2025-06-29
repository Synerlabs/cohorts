"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { createManualPayment } from '../actions';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePayment } from './payment-context';

interface ManualPaymentFormProps {
  order: any;
  orgId: string;
  userId: string;
}

export function ManualPaymentForm({
  order,
  orgId,
  userId,
}: ManualPaymentFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { registerManualSubmitHandler, setError, setPaymentStatus, isSubmitting, setIsSubmitting } = usePayment();

  // Register the submit handler with the payment context
  useEffect(() => {
    const submitHandler = async () => {
      console.log("Manual payment submit handler called");
      // Additional validation before attempting submission
      if (!validateForm()) {
        return false;
      }
      return await handleSubmit();
    };
    
    registerManualSubmitHandler(submitHandler);
    
    // Log for debugging
    console.log("Registered manual payment submit handler");
  }, [file, referenceNumber]);
  
  // Form validation
  const validateForm = () => {
    if (!file) {
      setError('Please upload your proof of payment');
      toast({
        variant: "destructive",
        title: "Missing File",
        description: "Please upload your proof of payment",
      });
      return false;
    }

    if (!referenceNumber.trim()) {
      setError('Please enter a payment reference number');
      toast({
        variant: "destructive",
        title: "Missing Reference",
        description: "Please enter a payment reference number",
      });
      return false;
    }
    
    return true;
  };

  // Handle the form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    // If called from an event (direct form submission), prevent default
    if (e) {
      e.preventDefault();
    }
    
    console.log("Processing manual payment submission");
    
    // Set loading state
    setIsSubmitting(true);

    try {
      console.log("Converting file to base64");
      // Convert file to base64
      const base64File = await fileToBase64(file!);
      
      // Prepare file data
      const fileData = {
        name: file!.name,
        type: file!.type,
        base64: base64File
      };
      
      console.log("Calling createManualPayment");
      // Call server action
      const result = await createManualPayment(
        order.id,
        orgId,
        userId,
        referenceNumber,
        [fileData]
      );
      
      console.log("Manual payment result:", result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process payment');
      }
      
      // Reset form
      setReferenceNumber('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast({
        title: "Payment Submitted",
        description: "Your payment proof has been submitted successfully and is pending review.",
      });
      
      setPaymentStatus('success');
      console.log("Manual payment submitted successfully");
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment submission failed';
      console.error("Manual payment error:", errorMessage);
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: errorMessage,
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "The file size must be less than 10MB",
        });
        return;
      }
      setFile(selectedFile);
    }
  };
  
  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix (e.g., "data:image/png;base64,")
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  return (
    <form id="manual-payment-form" onSubmit={handleSubmit}>
      <div>
        <Card>
          <CardContent className="pt-6 space-y-6">
            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription>
                Please make your payment via bank transfer to the account details below, then upload your proof of payment.
              </AlertDescription>
            </Alert>
            
            <div className="bg-muted/40 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Bank Name:</span>
                <span>Bank of Example</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Account Number:</span>
                <span>1234567890</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Account Name:</span>
                <span>Organization Name</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Payment Amount:</span>
                <span className="font-semibold">{
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: order.currency || 'USD'
                  }).format(order.amount / 100)
                }</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Reference:</span>
                <span>Order-{order.id.substring(0, 8)}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reference">Payment Reference Number</Label>
                <Input
                  id="reference"
                  placeholder="Enter your payment reference number"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proof">Proof of Payment</Label>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="proof"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50/50 hover:bg-slate-50"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG or PDF (max. 10MB)
                      </p>
                    </div>
                    <input
                      id="proof"
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      accept="image/png,image/jpeg,application/pdf"
                      onChange={handleFileChange}
                      required
                    />
                  </label>
                </div>
                {file && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected file: {file.name}
                  </p>
                )}
              </div>
            </div>

            {/* Instruction about submission */}
            <div className="text-sm text-center text-muted-foreground pt-2">
              Complete the information above, then use the &quot;Submit Payment Proof&quot; button in the order summary to submit.
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
} 