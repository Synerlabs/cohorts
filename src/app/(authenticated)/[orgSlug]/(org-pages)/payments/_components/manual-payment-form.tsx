'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';
import { createPaymentAction } from '../actions/payment.action';

const formSchema = z.object({
  amount: z.number().min(0),
  currency: z.string().min(1),
  proofFiles: z.array(z.any()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ManualPaymentFormProps {
  orderId: string;
  orgId: string;
  expectedAmount: number; // Amount in cents
  currency: string;
}

export function ManualPaymentForm({ orderId, orgId, expectedAmount, currency }: ManualPaymentFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: expectedAmount / 100, // Convert cents to dollars for display
      currency: currency,
      proofFiles: [],
    },
  });

  const [state, action, pending] = useToastActionState(createPaymentAction);
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!orderId) {
      console.error('Missing orderId');
      return;
    }

    console.log('Form submission started with data:', {
      amount: data.amount,
      currency: data.currency,
      fileCount: data.proofFiles?.length
    });

    const filesData = [];
    if (data.proofFiles?.length) {
      try {
        for (const file of data.proofFiles) {
          console.log('Processing file:', {
            name: file.name,
            type: file.type,
            size: file.size
          });
          // Convert file to base64
          const buffer = await file.arrayBuffer();
          console.log('File converted to buffer, size:', buffer.byteLength);
          const base64 = Buffer.from(buffer).toString('base64');
          console.log('File converted to base64, length:', base64.length);
          filesData.push({
            name: file.name,
            type: file.type,
            base64,
          });
        }
        console.log('Files data prepared successfully');
      } catch (error) {
        console.error('Error processing files:', error);
        return;
      }
    }

    console.log('Form data:', {
      amount: data.amount,
      currency: data.currency,
      proofFiles: filesData.map(f => ({
        name: f.name,
        type: f.type
      }))
    });

    const payload = {
      orderId,
      orgId,
      type: 'manual' as const,
      amount: Math.round(data.amount * 100), // Convert dollars to cents for storage
      currency: data.currency,
      proofFiles: filesData,
    };

    console.log('Submitting payment with payload:', {
      ...payload,
      proofFiles: payload.proofFiles.map(f => ({
        name: f.name,
        type: f.type
      }))
    });

    try {
      await action(payload);
      console.log('Payment submitted successfully');
      form.reset();
    } catch (error) {
      console.error('Error submitting payment:', error);
    }
  };

  console.log('State:', state);

  return state?.success ? <div>Payment submitted successfully</div> : (
    
    <Card>
      <CardHeader>
        <CardTitle>Submit Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ({currency})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={`${expectedAmount / 100}`}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="proofFiles"
              render={({ field: { onChange } }) => (
                <FormItem>
                  <FormLabel>Proof of Payment</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        console.log('File input change event:', {
                          hasFiles: !!files.length,
                          fileCount: files.length
                        });
                        console.log('Selected files details:', files.map(file => ({
                          name: file.name,
                          type: file.type,
                          size: file.size,
                          lastModified: file.lastModified
                        })));
                        // Set the files array in the form data
                        onChange(files);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting..." : "Submit Payment"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 