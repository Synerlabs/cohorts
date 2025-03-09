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

export async function createStripePaymentIntent(orderId: string, groupId: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = await createServiceRoleClient();
  
  // Check if order is already paid or completed
  const { data: orderDetails, error: orderDetailsError } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      status,
      amount,
      currency,
      applications!applications_order_id_fkey (
        id,
        status
      ),
      payments (
        id,
        status,
        amount
      )
    `)
    .eq('id', orderId)
    .single();

  if (orderDetailsError || !orderDetails) {
    console.error('Failed to fetch order:', orderDetailsError);
    throw new Error('Failed to fetch order');
  }

  // Check if order is already completed or paid
  if (orderDetails.status === 'completed' || orderDetails.status === 'paid') {
    throw new Error('This order has already been paid');
  }

  // Check if application is already settled
  const application = orderDetails.applications as unknown as { id: string; status: string } | null;
  if (application?.status === 'approved' || application?.status === 'completed') {
    throw new Error('This application has already been processed');
  }

  // Calculate total paid amount
  const totalPaid = orderDetails.payments
    ?.filter(p => p.status === 'approved' || p.status === 'paid')
    ?.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0;

  // Check if already fully paid
  if (totalPaid >= orderDetails.amount) {
    throw new Error('This order has already been fully paid');
  }
  
  // First, check for existing pending payment intent for this order
  const { data: existingPayment, error: existingPaymentError } = await supabase
    .from('payments')
    .select(`
      *,
      stripe_payments (
        stripe_payment_intent_id,
        stripe_status
      )
    `)
    .eq('order_id', orderId)
    .eq('type', 'stripe')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existingPayment?.stripe_payments?.stripe_payment_intent_id) {
    try {
      // Retrieve the payment intent to check its status
      const existingIntent = await stripe.paymentIntents.retrieve(
        existingPayment.stripe_payments.stripe_payment_intent_id
      );

      // If the intent is still usable (not expired, failed, or cancelled), return it
      if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingIntent.status)) {
        return { clientSecret: existingIntent.client_secret };
      }

      // If intent is not usable, cancel it if it's still cancellable
      if (!['succeeded', 'canceled'].includes(existingIntent.status)) {
        await stripe.paymentIntents.cancel(existingIntent.id);
      }

      // Mark the existing payment record as cancelled
      await supabase
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('id', existingPayment.id);
    } catch (error) {
      console.error('Error handling existing payment intent:', error);
      // Continue with creating new payment intent if there was an error
    }
  }

  // Get the connected account
  const connectedAccount = await getStripeConnectedAccount(groupId);

  // Calculate platform fee (e.g., 5%)
  const platformFeePercent = 5;
  const platformFee = Math.round((orderDetails.amount * platformFeePercent) / 100);

  // Create the payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: orderDetails.amount,
    currency: orderDetails.currency.toLowerCase(),
    application_fee_amount: platformFee,
    on_behalf_of: connectedAccount.account_id,
    transfer_data: {
      destination: connectedAccount.account_id,
    },
    metadata: {
      orderId,
      groupId
    }
  });

  // Create a payment record in pending state
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      order_id: orderId,
      user_id: orderDetails.user_id,
      group_id: groupId,
      type: 'stripe',
      status: 'pending',
      amount: orderDetails.amount,
      currency: orderDetails.currency,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (paymentError || !payment) {
    console.error('Failed to create payment record:', paymentError);
    throw new Error('Failed to create payment record');
  }

  // Create stripe payment record
  const { error: stripePaymentError } = await supabase
    .from('stripe_payments')
    .insert({
      payment_id: payment.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_status: paymentIntent.status,
    });

  if (stripePaymentError) {
    console.error('Failed to create stripe payment record:', stripePaymentError);
    throw new Error('Failed to create stripe payment record');
  }

  return { clientSecret: paymentIntent.client_secret };
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
        currency,
        applications!applications_order_id_fkey (
          id,
          status
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderDetailsError || !orderDetails) {
      console.error('Failed to fetch order:', orderDetailsError);
      throw new Error('Failed to fetch order');
    }

    // Validate user has access to this order
    if (orderDetails.user_id !== userId) {
      throw new Error('You do not have permission to make a payment for this order');
    }

    // Check if order is already completed or paid
    if (orderDetails.status === 'completed' || orderDetails.status === 'paid') {
      throw new Error('This order has already been paid');
    }

    // Step 1: Create a record in the payments table first
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        user_id: userId,
        group_id: groupId,
        type: 'manual',
        status: 'pending',
        amount: orderDetails.amount,
        currency: orderDetails.currency,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('Failed to create payment record:', paymentError);
      throw new Error('Failed to create payment record');
    }

    console.log('Payment record created:', payment.id);

    // Step 2: Create a record in the manual_payments table with just the notes field
    const { data: manualPayment, error: manualPaymentError } = await supabase
      .from('manual_payments')
      .insert({
        payment_id: payment.id,
        notes: referenceNumber
      })
      .select()
      .single();

    if (manualPaymentError) {
      console.error('Failed to create manual payment record:', manualPaymentError);
      
      // Clean up the payment record if manual payment creation fails
      await supabase.from('payments').delete().eq('id', payment.id);
      
      throw new Error('Failed to create manual payment record');
    }

    console.log('Manual payment record created:', manualPayment.id);

    // Step 3: Upload files and create upload records
    const uploadedFiles = [];
    
    if (proofFiles.length > 0) {
      try {
        // Create a bucket name based on the organization ID
        const bucketName = `org-${groupId}`;
        
        // Ensure the bucket exists
        const { error: bucketError } = await supabase.storage.getBucket(bucketName);
        if (bucketError) {
          // Create the bucket if it doesn't exist
          const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 52428800, // 50MB
          });
          
          if (createBucketError) {
            throw new Error(`Failed to create storage bucket: ${createBucketError.message}`);
          }
        }

        for (const file of proofFiles) {
          console.log(`Processing file "${file.name}" for upload`);
          
          // Generate a safe filename and path
          const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const date = new Date();
          const dateFormatted = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
          const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          const path = `manual-payments/${payment.id}/${dateFormatted}/${uniqueId}_${safeFilename}`;
          
          console.log(`Uploading file to path: ${path}`);
          
          // Convert base64 to blob
          let fileData;
          try {
            // Handle both prefixed and raw base64 strings
            const base64String = file.base64.includes('base64,') 
              ? file.base64.split('base64,')[1] 
              : file.base64;
            
            // Decode base64
            const byteString = atob(base64String);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            
            fileData = new Blob([ab], { type: file.type || 'application/octet-stream' });
          } catch (error) {
            console.error('Error processing base64 data:', error);
            throw new Error('Failed to process file data: Invalid base64 encoding');
          }
          
          // Upload file to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(path, fileData, {
              upsert: true,
              contentType: file.type
            });
            
          if (uploadError) {
            throw new Error(`Failed to upload file: ${uploadError.message}`);
          }
          
          console.log('File uploaded successfully:', uploadData);
          
          // Get the public URL
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(path);
            
          console.log('File public URL:', urlData.publicUrl);
          
          // Create upload record
          const { data: upload, error: uploadRecordError } = await supabase
            .from('uploads')
            .insert({
              module: 'manual-payments',
              original_filename: file.name,
              storage_path: path,
              storage_provider: 'supabase',
              file_url: urlData.publicUrl,
              file_id: path
            })
            .select()
            .single();
            
          if (uploadRecordError) {
            throw new Error(`Failed to create upload record: ${uploadRecordError.message}`);
          }
          
          console.log('Upload record created:', upload.id);
          
          // Create payment_uploads record
          const { error: paymentUploadError } = await supabase
            .from('payment_uploads')
            .insert({
              payment_id: payment.id,
              upload_id: upload.id
            });
            
          if (paymentUploadError) {
            throw new Error(`Failed to create payment_uploads record: ${paymentUploadError.message}`);
          }
          
          console.log('Payment upload record created successfully');
          
          uploadedFiles.push({
            id: upload.id,
            filename: file.name,
            url: urlData.publicUrl
          });
        }
      } catch (error) {
        console.error('Error uploading files:', error);
        
        // Clean up the payment records
        await supabase.from('manual_payments').delete().eq('payment_id', payment.id);
        await supabase.from('payments').delete().eq('id', payment.id);
        
        // Re-throw the error
        throw new Error(`Failed to upload files: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Update order status to pending_approval if it was pending
    if (orderDetails.status === 'pending') {
      await supabase
        .from('orders')
        .update({ 
          status: 'pending_approval',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
    }

    console.log('Successfully created manual payment record with uploads:', {
      paymentId: payment.id,
      uploadCount: uploadedFiles.length
    });

    // Revalidate the payments page
    revalidatePath(`/@${groupId}/join/payments`);

    return { 
      success: true, 
      payment,
      uploads: uploadedFiles
    };
  } catch (error) {
    console.error('Error creating manual payment:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
} 