'use server';

import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { createStorageProvider } from '@/services/storage/storage-settings.service';
import { revalidatePath } from 'next/cache';
import { User } from '@supabase/supabase-js';

// Add function to get Stripe connected account
async function getStripeConnectedAccount(groupId: string) {
  const supabase = await createServiceRoleClient();
  
  const { data: account, error } = await supabase
    .from('stripe_connected_accounts')
    .select('account_id, is_active')
    .eq('org_id', groupId)
    .eq('is_active', true)
    .single();

  if (error || !account) {
    console.error('Failed to get Stripe connected account:', error);
    throw new Error('No active Stripe account available for this organization');
  }

  return account;
}

// Make sure the createStripePaymentIntent function always returns a resolved client secret
export async function createStripePaymentIntent(orderId: string, groupId: string) {
  try {
    const supabase = await createServiceRoleClient();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    // Get order details
    const { data: orderDetails, error: orderDetailsError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        status,
        amount,
        currency
      `)
      .eq('id', orderId)
      .single();

    if (orderDetailsError || !orderDetails) {
      console.error('Failed to fetch order:', orderDetailsError);
      throw new Error('Failed to fetch order');
    }

    // Check if order is already paid
    const isPaid = orderDetails.status === 'paid' || 
                  orderDetails.status === 'completed';
    
    if (isPaid) {
      throw new Error('This order has already been paid');
    }
    
    // Check if there's already a Stripe payment for this order
    const { data: existingPayment, error: existingPaymentError } = await supabase
      .from('payments')
      .select(`
        id,
        status,
        stripe_payments (
          payment_id,
          stripe_payment_intent_id,
          stripe_payment_intent_client_secret,
          stripe_account_id
        )
      `)
      .eq('order_id', orderId)
      .eq('type', 'stripe')
      .in('status', ['initialized', 'pending'])
      .maybeSingle();
    
    // Get connected account
    const { data: account, error: accountError } = await supabase
      .from('stripe_connected_accounts')
      .select('account_id, is_active')
      .eq('org_id', groupId)
      .eq('is_active', true)
      .single();

    if (accountError || !account) {
      console.error('Failed to get Stripe connected account:', accountError);
      throw new Error('No active Stripe account available for this organization');
    }
    
    // If there's an existing payment with a client secret, return that
    if (existingPayment && 
        !existingPaymentError && 
        existingPayment.stripe_payments && 
        existingPayment.stripe_payments.length > 0 && 
        existingPayment.stripe_payments[0].stripe_payment_intent_client_secret) {
      
      console.log('Using existing payment intent for order:', orderId);
      
      return {
        clientSecret: existingPayment.stripe_payments[0].stripe_payment_intent_client_secret,
        accountId: account.account_id
      };
    }

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: orderDetails.amount,
      currency: orderDetails.currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        order_id: orderId,
        group_id: groupId
      }
    }, {
      stripeAccount: account.account_id,
    });

    if (!paymentIntent || !paymentIntent.client_secret) {
      throw new Error('Failed to create payment intent');
    }

    // Create payment record in the database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        user_id: orderDetails.user_id,
        group_id: groupId,
        type: 'stripe',
        status: 'initialized',
        amount: orderDetails.amount,
        currency: orderDetails.currency
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
      throw new Error('Failed to create payment record');
    }

    // Create stripe_payments record
    const { error: stripePaymentError } = await supabase
      .from('stripe_payments')
      .insert({
        payment_id: payment.id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_payment_intent_client_secret: paymentIntent.client_secret,
        stripe_account_id: account.account_id
      });

    if (stripePaymentError) {
      console.error('Failed to create stripe payment record:', stripePaymentError);
      throw new Error('Failed to create stripe payment record');
    }

    // Return the client secret and account ID
    return {
      clientSecret: paymentIntent.client_secret,
      accountId: account.account_id
    };
  } catch (error) {
    console.error('Error creating Stripe payment intent:', error);
    throw error;
  }
}

// Add function to process manual payments
export async function createManualPayment(
  orderId: string,
  groupId: string,
  userId: string,
  referenceNumber: string,
  proofFiles: {
    name: string;
    type: string;
    base64: string;
  }[]
) {
  try {
    const supabase = await createServiceRoleClient();
    
    // Get order details
    const { data: orderDetails, error: orderDetailsError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        status,
        amount,
        currency
      `)
      .eq('id', orderId)
      .single();

    if (orderDetailsError || !orderDetails) {
      console.error('Failed to fetch order:', orderDetailsError);
      return { success: false, error: 'Failed to fetch order' };
    }

    // Validate that the user has access to this order
    if (orderDetails.user_id !== userId) {
      console.error('User does not have access to this order');
      return { success: false, error: 'User does not have access to this order' };
    }

    // Check if order is already paid
    const isPaid = orderDetails.status === 'paid' || orderDetails.status === 'completed';
    
    if (isPaid) {
      return { success: false, error: 'This order has already been paid' };
    }

    // Create payment record in the database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        user_id: userId,
        group_id: groupId,
        type: 'manual',
        status: 'pending_approval',
        amount: orderDetails.amount,
        currency: orderDetails.currency
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
      return { success: false, error: 'Failed to create payment record' };
    }

    // Create manual_payments record
    const { error: manualPaymentError } = await supabase
      .from('manual_payments')
      .insert({
        payment_id: payment.id,
        notes: `Reference: ${referenceNumber}`
      });

    if (manualPaymentError) {
      console.error('Failed to create manual payment record:', manualPaymentError);
      return { success: false, error: 'Failed to create manual payment record' };
    }

    // Handle proof files
    if (proofFiles && proofFiles.length > 0) {
      try {
        // Get storage provider
        const storageProvider = await createStorageProvider(groupId);
        
        if (!storageProvider) {
          console.error('Failed to create storage provider');
          return { success: false, error: 'Failed to create storage provider' };
        }
        
        for (const proofFile of proofFiles) {
          try {
            // Convert base64 to Buffer
            const buffer = Buffer.from(proofFile.base64, 'base64');
            
            // Generate a filename with timestamp to avoid collisions
            const timestamp = Date.now();
            const filename = `${timestamp}_${proofFile.name}`;
            
            // Upload file to storage
            const uploadResult = await storageProvider.upload(
              buffer, 
              `payments/proofs/${payment.id}/${filename}`, 
              groupId, 
              'payments'
            );
            
            // Create upload record
            const { data: upload, error: uploadError } = await supabase
              .from('uploads')
              .insert({
                original_filename: proofFile.name,
                file_path: uploadResult.path,
                storage_provider: 'supabase',
                content_type: proofFile.type,
                module: 'payments',
                size_bytes: buffer.length,
                url: uploadResult.url
              })
              .select()
              .single();
              
            if (uploadError) {
              console.error('Failed to create upload record:', uploadError);
              continue;
            }
            
            // Create payment_uploads record to link upload to payment
            const { error: paymentUploadError } = await supabase
              .from('payment_uploads')
              .insert({
                payment_id: payment.id,
                upload_id: upload.id
              });
              
            if (paymentUploadError) {
              console.error('Failed to create payment_uploads record:', paymentUploadError);
            }
          } catch (fileError) {
            console.error('Failed to upload proof file:', fileError);
          }
        }
      } catch (storageError) {
        console.error('Failed to handle file uploads:', storageError);
      }
    }

    // Update order status if it was pending
    if (orderDetails.status === 'pending') {
      await supabase
        .from('orders')
        .update({ status: 'pending_approval' })
        .eq('id', orderId);
    }

    return { success: true, payment };
  } catch (error) {
    console.error('Error creating manual payment:', error);
    return { success: false, error: 'Failed to create manual payment' };
  }
} 