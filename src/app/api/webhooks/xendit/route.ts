'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import { PaymentProcessorService } from '@/services/payment/payment-processor.service';
import * as crypto from 'crypto';

/**
 * Verify Xendit webhook signature
 */
function verifySignature(payload: string, signature: string, webhookKey: string): boolean {
  try {
    const hmac = crypto.createHmac('sha256', webhookKey);
    const digest = hmac.update(payload).digest('hex');
    return signature === digest;
  } catch (error) {
    console.error('Error verifying Xendit webhook signature:', error);
    return false;
  }
}

/**
 * Xendit webhook handler
 */
export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('x-callback-token') || '';
    
    // Verify signature
    if (!verifySignature(payload, signature, process.env.XENDIT_WEBHOOK_KEY!)) {
      console.error('❌ Invalid Xendit webhook signature');
      return new NextResponse('Invalid signature', { status: 401 });
    }
    
    const data = JSON.parse(payload);
    console.log('📣 Received Xendit webhook:', {
      event: data.event,
      id: data.data?.id
    });
    
    // Process based on event type
    if (data.event === 'invoice.paid') {
      const invoiceId = data.data.id;
      const supabase = await createServiceRoleClient();
      
      // Find the payment record
      const { data: xenditPayment, error: xenditError } = await supabase
        .from('xendit_payments')
        .select('payment_id')
        .eq('xendit_invoice_id', invoiceId)
        .single();
      
      if (xenditError || !xenditPayment) {
        console.error('❌ Failed to find Xendit payment:', { error: xenditError, invoiceId });
        return new NextResponse('Payment not found', { status: 404 });
      }
      
      // Get the payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('id, order_id, status')
        .eq('id', xenditPayment.payment_id)
        .single();
      
      if (paymentError || !payment) {
        console.error('❌ Failed to find payment:', { error: paymentError, paymentId: xenditPayment.payment_id });
        return new NextResponse('Payment not found', { status: 404 });
      }
      
      console.log('✅ Found payment record:', {
        paymentId: payment.id,
        orderId: payment.order_id,
        currentStatus: payment.status
      });
      
      // Only process if the payment isn't already paid
      if (payment.status === 'paid') {
        console.log('ℹ️ Payment already marked as paid, skipping processing');
        return NextResponse.json({ success: true, message: 'Payment already processed' });
      }
      
      // Update xendit payment status
      const { error: updateXenditError } = await supabase
        .from('xendit_payments')
        .update({ 
          xendit_status: data.data.status,
          payment_method: data.data.payment_method,
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', payment.id);
      
      if (updateXenditError) {
        console.error('❌ Failed to update xendit payment:', updateXenditError);
        return new NextResponse('Failed to update payment', { status: 500 });
      }
      
      console.log('✅ Updated xendit payment status');
      
      // Update payment status to paid
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({ 
          status: 'paid',
          updated_at: new Date().toISOString(),
          approved_at: new Date().toISOString()
        })
        .eq('id', payment.id);
      
      if (updatePaymentError) {
        console.error('❌ Failed to update payment status:', updatePaymentError);
        return new NextResponse('Failed to update payment', { status: 500 });
      }
      
      console.log('✅ Updated payment status to paid');
      
      // Process the order and its suborders
      try {
        await PaymentProcessorService.processPayment(payment.order_id);
        console.log('✅ Order processed successfully:', payment.order_id);
      } catch (error) {
        console.error('❌ Failed to process order:', error);
        return new NextResponse('Failed to process order', { status: 500 });
      }
    } else if (data.event === 'invoice.expired') {
      // Handle expired invoices
      const invoiceId = data.data.id;
      const supabase = await createServiceRoleClient();
      
      // Find the payment record
      const { data: xenditPayment, error: xenditError } = await supabase
        .from('xendit_payments')
        .select('payment_id')
        .eq('xendit_invoice_id', invoiceId)
        .single();
      
      if (xenditError || !xenditPayment) {
        console.error('❌ Failed to find Xendit payment:', { error: xenditError, invoiceId });
        return new NextResponse('Payment not found', { status: 404 });
      }
      
      // Update xendit payment status
      const { error: updateXenditError } = await supabase
        .from('xendit_payments')
        .update({ 
          xendit_status: 'EXPIRED',
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', xenditPayment.payment_id);
      
      if (updateXenditError) {
        console.error('❌ Failed to update xendit payment status:', updateXenditError);
        return new NextResponse('Failed to update payment', { status: 500 });
      }
      
      console.log('✅ Updated Xendit payment status to expired:', xenditPayment.payment_id);
      
      // Update payment status to rejected
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString(),
          notes: 'Payment expired'
        })
        .eq('id', xenditPayment.payment_id);
      
      if (updatePaymentError) {
        console.error('❌ Failed to update payment status:', updatePaymentError);
        return new NextResponse('Failed to update payment', { status: 500 });
      }
      
      console.log('✅ Updated payment status to rejected due to expiration:', xenditPayment.payment_id);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error processing Xendit webhook:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 