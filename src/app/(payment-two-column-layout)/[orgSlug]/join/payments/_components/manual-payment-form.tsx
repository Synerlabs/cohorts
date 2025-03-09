"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { createManualPayment } from '../actions';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ManualPaymentFormProps {
  order: any;
  orgId: string;
  userId: string;
  onError: (message: string) => void;
  onProcessing: () => void;
  onSuccess: () => void;
}

export function ManualPaymentForm({
  order,
  orgId,
  userId,
  onError,
  onProcessing,
  onSuccess
}: ManualPaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      onError('Please upload your proof of payment');
      return;
    }

    if (!referenceNumber.trim()) {
      onError('Please enter a payment reference number');
      return;
    }

    setIsLoading(true);
    onProcessing();

    try {
      // Convert file to base64
      const base64File = await fileToBase64(file);
      
      // Prepare file data
      const fileData = {
        name: file.name,
        type: file.type,
        base64: base64File
      };
      
      // Call server action
      const result = await createManualPayment(
        order.id,
        orgId,
        userId,
        referenceNumber,
        [fileData]
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process payment');
      }
      
      // Show success
      setIsSuccess(true);
      toast({
        title: "Payment Submitted",
        description: "Your payment proof has been submitted successfully and is pending review.",
      });
      
      // Call onSuccess to notify parent component
      onSuccess();
      
      // Reset form
      setReferenceNumber('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment submission failed';
      onError(errorMessage);
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
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

  if (isSuccess) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium">Payment Submitted Successfully</h3>
            <p className="text-muted-foreground max-w-md">
              Your payment proof has been submitted and is pending review by the organization administrator.
              You will be notified when your payment is approved.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
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

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Submit Bank Transfer Proof'
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
} 