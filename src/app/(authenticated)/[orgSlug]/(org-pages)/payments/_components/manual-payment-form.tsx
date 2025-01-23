'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { uploadProofOfPaymentAction } from '../actions/manual-payment.action';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';

const formSchema = z.object({
  file: z.instanceof(File),
});

type FormValues = z.infer<typeof formSchema>;

interface ManualPaymentFormProps {
  paymentId: string;
  onSuccess?: () => void;
}

export function ManualPaymentForm({ paymentId, onSuccess }: ManualPaymentFormProps) {
  const { orgSlug } = useParams();
  const [state, uploadProof] = useToastActionState(uploadProofOfPaymentAction, undefined, undefined, {
    successTitle: 'Upload Successful',
    successDescription: 'Proof of payment has been uploaded successfully',
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (values: FormValues) => {
    await uploadProof({ success: false }, {
      paymentId,
      orgId: orgSlug as string,
      file: values.file,
    });
    onSuccess?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Proof of Payment</CardTitle>
        <CardDescription>Please upload a screenshot or photo of your payment</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange } }) => (
                <FormItem>
                  <FormLabel>Payment Screenshot</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onChange(file);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Upload Proof</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 