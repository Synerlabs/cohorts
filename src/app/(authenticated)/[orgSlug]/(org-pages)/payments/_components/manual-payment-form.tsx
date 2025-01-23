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
  proofFile: z.instanceof(File).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ManualPaymentFormProps {
  orderId: string;
  orgId: string;
  expectedAmount: number;
  currency: string;
}

export function ManualPaymentForm({ orderId, orgId, expectedAmount, currency }: ManualPaymentFormProps) {
  const [state, action] = useToastActionState(createPaymentAction, undefined, undefined, {
    successTitle: "Payment Submitted",
    successDescription: "Your payment has been submitted for review."
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: expectedAmount,
      currency: currency,
    },
  });

  async function onSubmit(data: FormValues) {
    if (!orderId) {
      console.error('Missing orderId');
      return;
    }

    const payload = {
      orderId,
      orgId,
      type: 'manual' as const,
      amount: data.amount,
      currency: data.currency,
      proofFile: data.proofFile,
    };
    
    console.log('Submitting payment with payload:', payload);
    
    await action(payload);
  }

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
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
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
                      onChange={(e) =>
                        field.onChange(e.target.files ? e.target.files[0] : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={state?.loading}>
              Submit Payment
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 