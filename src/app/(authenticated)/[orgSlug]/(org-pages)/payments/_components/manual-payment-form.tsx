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
  proofFile: z.any().optional(),
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
    },
  });

  const [state, action, pending] = useToastActionState(createPaymentAction);
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!orderId) {
      console.error('Missing orderId');
      return;
    }

    let fileData = null;
    if (data.proofFile) {
      // Convert file to base64
      const buffer = await data.proofFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      fileData = {
        name: data.proofFile.name,
        type: data.proofFile.type,
        base64,
      };
    }

    console.log('Form data:', {
      amount: data.amount,
      currency: data.currency,
      proofFile: fileData ? {
        name: fileData.name,
        type: fileData.type,
        size: data.proofFile?.size
      } : null
    });

    const payload = {
      orderId,
      orgId,
      type: 'manual' as const,
      amount: Math.round(data.amount * 100), // Convert dollars to cents for storage
      currency: data.currency,
      proofFile: fileData,
    };

    console.log('Submitting payment with payload:', {
      ...payload,
      proofFile: payload.proofFile ? {
        name: payload.proofFile.name,
        type: payload.proofFile.type
      } : null
    });

    try {
      await action(payload);
      console.log('Payment submitted successfully');
      form.reset();
    } catch (error) {
      console.error('Error submitting payment:', error);
    }
  };

  return (
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
              name="proofFile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proof of Payment</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        console.log('File selected:', file ? {
                          name: file.name,
                          type: file.type,
                          size: file.size
                        } : null);
                        field.onChange(file || null);
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