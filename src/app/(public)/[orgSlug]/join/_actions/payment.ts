'use server';

import { createClient } from "@/lib/utils/supabase/server";

type PaymentState = {
  success: boolean;
  error?: string;
  orderId?: string;
};

async function createOrder(userId: string, productId: string, amount: number, currency: string) {
  const supabase = await createClient();
  
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      product_id: productId,
      type: 'membership',
      status: 'pending',
      amount,
      currency,
    })
    .select()
    .single();

  if (error) throw error;
  return order;
}

export async function createPaymentAction(
  prevState: PaymentState | null,
  formData: FormData
): Promise<PaymentState> {
  try {
    const userId = formData.get('userId') as string;
    const productId = formData.get('productId') as string;
    const amount = parseInt(formData.get('amount') as string);
    const currency = formData.get('currency') as string;
    const applicationId = formData.get('applicationId') as string;

    if (!userId || !productId || !amount || !currency || !applicationId) {
      return {
        success: false,
        error: 'Missing required fields'
      };
    }

    const supabase = await createClient();

    // Create the order
    const order = await createOrder(userId, productId, amount, currency);

    // Link the order to the application
    const { error: linkError } = await supabase
      .from('applications')
      .update({ order_id: order.id })
      .eq('id', applicationId);

    if (linkError) throw linkError;

    return {
      success: true,
      orderId: order.id
    };

  } catch (error: any) {
    console.error('Payment creation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create payment'
    };
  }
} 