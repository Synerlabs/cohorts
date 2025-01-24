'use server';

import { Payment, PaymentService } from "@/services/payment.service";
import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { StorageSettingsService } from "@/services/storage/storage-settings.service";
import { revalidatePath } from "next/cache";

export type PaymentFormState = {
  success: boolean;
  error?: string;
  data?: Payment;
};

export type PaymentActionPayload = {
  paymentId: string;
  userId: string;
  notes?: string;
};

export async function approvePaymentAction(
  prevState: PaymentFormState,
  payload: PaymentActionPayload
): Promise<PaymentFormState> {
  try {
    const result = await PaymentService.approvePayment(
      payload.paymentId,
      payload.userId,
      payload.notes
    );

    if (!result) {
      return { success: false, error: "Failed to approve payment" };
    }

    // Complete the application process
    try {
      await completeApplicationPayment(result.orderId);
    } catch (error) {
      console.error("Error completing application payment:", error);
      return {
        success: false,
        error: "Payment approved but failed to activate membership. Please contact support.",
      };
    }

    revalidatePath('/[orgSlug]/applications');
    return { success: true, data: result };
  } catch (error) {
    console.error("Error approving payment:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function rejectPaymentAction(
  prevState: PaymentFormState,
  payload: PaymentActionPayload
): Promise<PaymentFormState> {
  try {
    if (!payload.notes) {
      return { success: false, error: "Notes are required when rejecting a payment" };
    }

    const result = await PaymentService.rejectPayment(
      payload.paymentId,
      payload.userId,
      payload.notes
    );

    if (!result) {
      return { success: false, error: "Failed to reject payment" };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Error rejecting payment:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getPaymentsByOrgIdAction(
  prevState: null,
  payload: { orgId: string }
): Promise<Payment[]> {
  return PaymentService.getPaymentsByOrgId(payload.orgId);
}

async function completeApplicationPayment(orderId: string) {
  const supabase = await createServiceRoleClient();

  // Get the application associated with this order
  const { data: order } = await supabase
    .from('orders')
    .select('*, applications(*)')
    .eq('id', orderId)
    .single();

  if (!order?.applications?.[0]) {
    throw new Error('No application found for this order');
  }

  const application = order.applications[0];

  // Update application status to approved
  const { error: updateError } = await supabase
    .from('applications')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString()
    })
    .eq('id', application.id);

  if (updateError) throw updateError;

  // Activate the group user
  const { error: activateError } = await supabase
    .from('group_users')
    .update({ is_active: true })
    .eq('id', application.group_user_id);

  if (activateError) throw activateError;
}

export async function createPaymentAction(
  prevState: PaymentFormState,
  payload: {
    orderId: string;
    orgId: string;
    type: 'manual' | 'stripe';
    amount: number;
    currency: string;
    proofFile?: {
      name: string;
      type: string;
      base64: string;
    };
  }
): Promise<PaymentFormState> {
  try {
    if (!payload.orderId) {
      console.error('Missing orderId in payload');
      return {
        success: false,
        error: 'Missing orderId',
      };
    }

    const supabase = await createServiceRoleClient();
    
    // Get user ID from session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    console.log('Creating payment with payload:', {
      order_id: payload.orderId,
      user_id: user.id,
      type: payload.type,
      amount: payload.amount,
      currency: payload.currency,
    });

    // Create the payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: payload.orderId,
        user_id: user.id,
        type: payload.type,
        amount: payload.amount,
        currency: payload.currency,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error creating payment:", paymentError);
      return {
        success: false,
        error: paymentError.message,
      };
    }

    // If it's a manual payment with a proof file, upload it
    if (payload.type === 'manual' && payload.proofFile) {
      try {
        console.log('Attempting to upload proof file:', {
          hasFile: !!payload.proofFile,
          fileData: {
            name: payload.proofFile.name,
            type: payload.proofFile.type,
            hasBase64: !!payload.proofFile.base64,
            base64Length: payload.proofFile.base64?.length,
            keys: Object.keys(payload.proofFile)
          }
        });

        // Get storage provider
        const provider = await StorageSettingsService.createStorageProvider(payload.orgId);
        if (!provider) {
          console.error('Storage provider not configured for org:', payload.orgId);
          throw new Error('Storage provider not configured');
        }
        console.log('Storage provider created successfully');

        // Upload file
        const path = `proof-of-payments/${payment.id}/${payload.proofFile.name}`;
        console.log('Uploading file to path:', path);

        try {
          const result = await provider.upload(payload.proofFile, path);
          console.log('File uploaded successfully:', result);

          // Update payment record with proof file info
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              proof_file_id: result.fileId,
              proof_url: result.url,
            })
            .eq('id', payment.id);

          if (updateError) {
            console.error("Error updating payment with proof:", updateError);
            return {
              success: false,
              error: updateError.message,
            };
          }
          console.log('Payment record updated with proof file info');

          payment.proof_url = result.url;
        } catch (uploadError: any) {
          console.error("Error uploading proof:", uploadError);
          console.error("Upload error details:", {
            message: uploadError.message,
            stack: uploadError.stack,
            cause: uploadError.cause
          });
          return {
            success: false,
            error: "Failed to upload proof of payment: " + uploadError.message,
          };
        }
      } catch (error: any) {
        console.error("Error in file upload process:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          cause: error.cause
        });
        return {
          success: false,
          error: "Failed to process file upload: " + error.message,
        };
      }
    }

    return {
      success: true,
      data: PaymentService.mapPayment(payment),
    };
  } catch (error) {
    console.error("Error in createPaymentAction:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
} 