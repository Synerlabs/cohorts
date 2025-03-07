"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';

interface ManualPaymentFormProps {
  order: any;
  orgId: string;
  onError: (message: string) => void;
  onProcessing: () => void;
}

export function ManualPaymentForm({
  order,
  orgId,
  onError,
  onProcessing
}: ManualPaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      onError('Please upload your proof of payment');
      return;
    }

    setIsLoading(true);
    onProcessing();

    try {
      // TODO: Implement file upload and manual payment processing
      // This is a placeholder for the actual implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Simulate error for now since this is just a placeholder
      throw new Error('Manual payment processing not implemented yet');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Payment submission failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Payment Reference Number</Label>
              <Input
                id="reference"
                placeholder="Enter your payment reference number"
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
                Submitting...
              </>
            ) : (
              'Submit Payment Proof'
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
} 