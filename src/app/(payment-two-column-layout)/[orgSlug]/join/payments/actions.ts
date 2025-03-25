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
    
    console.log(`[${new Date().toISOString()}] Starting createStripePaymentIntent for order: ${orderId}`);
    
    // STEP 1: Check for existing Stripe payment records first with valid Stripe data
    // Use a join query to only get payments that have related stripe_payments records
    const { data: existingStripePayments, error: existingPaymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        status,
        created_at,
        user_id,
        stripe_payments!inner(
          payment_id,
          stripe_payment_intent_id,
          stripe_payment_intent_client_secret,
          stripe_account_id
        )
      `)
      .eq('order_id', orderId)
      .eq('type', 'stripe')
      .not('status', 'eq', 'cancelled')
      .not('status', 'eq', 'failed');
    
    console.log(`Found ${existingStripePayments?.length || 0} existing Stripe payment records for order: ${orderId}`);
    
    // If we have existing payments with stripe data, check each one
    if (existingStripePayments && existingStripePayments.length > 0) {
      // First, get the Stripe connected account to use with API calls
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
      
      // Try each existing payment record, starting with the most recent
      const sortedPayments = [...existingStripePayments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      for (const payment of sortedPayments) {
        // Each payment should have stripe_payments data due to inner join
        if (!payment.stripe_payments || payment.stripe_payments.length === 0) {
          console.log(`Payment ${payment.id} unexpectedly has no stripe_payments data, skipping`);
          continue;
        }
        
        const stripePayment = payment.stripe_payments[0];
        
        // Double check the payment data has the required fields
        if (!stripePayment.stripe_payment_intent_id || !stripePayment.stripe_payment_intent_client_secret) {
          console.log(`Payment ${payment.id} missing intent ID or client secret, skipping`);
          continue;
        }
        
        try {
          console.log(`Checking Stripe intent ${stripePayment.stripe_payment_intent_id} for payment ${payment.id}`);
          
          // Retrieve the intent from Stripe
          const intent = await stripe.paymentIntents.retrieve(
            stripePayment.stripe_payment_intent_id,
            { stripeAccount: account.account_id }
          );
          
          console.log(`Intent ${stripePayment.stripe_payment_intent_id} has status: ${intent.status}`);
          
          // Check if the intent is usable
          if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(intent.status)) {
            console.log(`Found valid intent ${stripePayment.stripe_payment_intent_id} - reusing it`);
            
            // Return the existing client secret
            return {
              clientSecret: stripePayment.stripe_payment_intent_client_secret,
              accountId: account.account_id
            };
          } else {
            console.log(`Intent ${intent.id} has status ${intent.status}, not reusable`);
          }
        } catch (error) {
          console.error(`Error retrieving intent ${stripePayment.stripe_payment_intent_id}:`, error);
          // Continue to next payment
        }
      }
      
      console.log(`No reusable payment intents found for order ${orderId}, creating new one`);
    }
    
    // STEP 2: If no reusable intents found, continue with creating a new one
    
    // Get order details
    const { data: orderDetails, error: orderDetailsError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        status,
        amount,
        currency,
        payments (
          id,
          status,
          amount,
          type
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderDetailsError || !orderDetails) {
      console.error('Failed to fetch order:', orderDetailsError);
      throw new Error('Failed to fetch order');
    }

    // Check if order is already paid or completed
    if (orderDetails.status === 'paid' || orderDetails.status === 'completed') {
      console.log(`Order ${orderId} is already paid, not creating new payment intent`);
      throw new Error('This order has already been paid');
    }

    // Calculate total paid amount
    const totalPaid = orderDetails.payments
      ?.filter(p => p.status === 'approved' || p.status === 'paid')
      ?.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0;

    // Check if already fully paid
    if (totalPaid >= orderDetails.amount) {
      console.log(`Order ${orderId} is already fully paid (${totalPaid} paid of ${orderDetails.amount}), not creating new payment intent`);
      throw new Error('This order has already been fully paid');
    }
    
    // Get connected account if not already retrieved
    let account;
    if (!account) {
      const { data, error } = await supabase
        .from('stripe_connected_accounts')
        .select('account_id, is_active')
        .eq('org_id', groupId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('Failed to get Stripe connected account:', error);
        throw new Error('No active Stripe account available for this organization');
      }
      
      account = data;
    }
    
    // Create a new payment intent
    console.log(`Creating new payment intent for order: ${orderId}`);
    
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

    console.log(`Created new payment intent: ${paymentIntent.id} with status: ${paymentIntent.status}`);

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

    console.log(`Created payment record with ID: ${payment.id}`);

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

    console.log(`Successfully created stripe payment record for payment intent: ${paymentIntent.id}`);
    
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
                storage_path: uploadResult.path,
                storage_provider: 'supabase',
                module: 'payments',
                file_url: uploadResult.url,
                file_id: uploadResult.path
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