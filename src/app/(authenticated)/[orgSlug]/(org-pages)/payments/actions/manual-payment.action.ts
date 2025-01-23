"use server";

import { ManualPayment, ManualPaymentService } from "@/services/manual-payment.service";
import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { StorageSettingsService } from "@/services/storage/storage-settings.service";
import { revalidatePath } from "next/cache";

export type ManualPaymentFormState = {
  success: boolean;
  error?: string;
  data?: {
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    proofUrl?: string;
    status: 'pending' | 'approved' | 'rejected';
  };
};

export type UploadProofPayload = {
  paymentId: string;
  orgId: string;
  file: File;
};

export type PaymentActionPayload = {
  paymentId: string;
  userId: string;
  notes?: string;
};

export async function uploadProofOfPaymentAction(
  prevState: ManualPaymentFormState,
  payload: UploadProofPayload
): Promise<ManualPaymentFormState> {
  try {
    if (!payload.file) {
      return { success: false, error: "No file provided" };
    }

    const result = await ManualPaymentService.uploadProofOfPayment(
      payload.paymentId,
      payload.orgId,
      payload.file
    );

    if (!result) {
      return { success: false, error: "Failed to upload proof of payment" };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Error uploading proof of payment:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
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

export async function approvePaymentAction(
  prevState: ManualPaymentFormState,
  payload: PaymentActionPayload
): Promise<ManualPaymentFormState> {
  try {
    const supabase = await createServiceRoleClient();

    // Get the payment to find the order
    const { data: payment } = await supabase
      .from('manual_payments')
      .select('order_id')
      .eq('id', payload.paymentId)
      .single();

    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    // First approve the payment
    const result = await ManualPaymentService.approvePayment(
      payload.paymentId,
      payload.userId,
      payload.notes
    );

    if (!result) {
      return { success: false, error: "Failed to approve payment" };
    }

    // Then complete the application process
    try {
      await completeApplicationPayment(payment.order_id);
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
  prevState: ManualPaymentFormState,
  payload: PaymentActionPayload
): Promise<ManualPaymentFormState> {
  try {
    if (!payload.notes) {
      return { success: false, error: "Notes are required when rejecting a payment" };
    }

    const result = await ManualPaymentService.rejectPayment(
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

export async function getPaymentsByOrderIdAction(
  prevState: null,
  payload: { orderId: string }
): Promise<ManualPayment[]> {
  return ManualPaymentService.getPaymentsByOrderId(payload.orderId);
}

export async function getPaymentsByOrgIdAction(
  prevState: null,
  payload: { orgId: string }
): Promise<ManualPayment[]> {
  const supabase = await createServiceRoleClient();
  
  // Get all payments for orders in this organization
  const { data: payments, error } = await supabase
    .from('manual_payments')
    .select('*, orders(*, products(*))')
    .eq('orders.products.group_id', payload.orgId)
    .order('created_at', { ascending: false });

  if (error || !payments) {
    console.error('Error loading payments:', error);
    return [];
  }

  return payments.map(payment => ({
    id: payment.id,
    orderId: payment.order_id,
    amount: payment.amount,
    currency: payment.currency,
    proofFileId: payment.proof_file_id,
    proofUrl: payment.proof_url,
    status: payment.status,
    notes: payment.notes,
    createdAt: new Date(payment.created_at),
    updatedAt: new Date(payment.updated_at),
    approvedAt: payment.approved_at ? new Date(payment.approved_at) : undefined,
    approvedBy: payment.approved_by,
  }));
}

export async function createManualPaymentAction(
  prevState: ManualPaymentFormState,
  payload: {
    orderId: string;
    orgId: string;
    amount: number;
    currency: string;
    proofFile?: File;
  }
): Promise<ManualPaymentFormState> {
  try {
    if (!payload.orderId) {
      console.error('Missing orderId in payload');
      return {
        success: false,
        error: 'Missing orderId',
      };
    }

    console.log('Creating manual payment with payload:', {
      order_id: payload.orderId,
      amount: payload.amount,
      currency: payload.currency,
    });

    const supabase = await createServiceRoleClient();

    // Create the manual payment
    const { data: payment, error: paymentError } = await supabase
      .from('manual_payments')
      .insert({
        order_id: payload.orderId,
        amount: payload.amount,
        currency: payload.currency,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error creating manual payment:", paymentError);
      return {
        success: false,
        error: paymentError.message,
      };
    }

    // If there's a proof file, upload it
    if (payload.proofFile) {
      try {
        // Get storage provider
        const provider = await StorageSettingsService.createStorageProvider(payload.orgId);
        if (!provider) {
          throw new Error('Storage provider not configured');
        }

        // Upload file
        const path = `proof-of-payments/${payment.id}/${payload.proofFile.name}`;
        const result = await provider.upload(payload.proofFile, path);

        // Update payment record with proof file info
        const { error: updateError } = await supabase
          .from('manual_payments')
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

        payment.proof_url = result.url;
      } catch (uploadError) {
        console.error("Error uploading proof:", uploadError);
        return {
          success: false,
          error: "Failed to upload proof of payment",
        };
      }
    }

    return {
      success: true,
      data: {
        id: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        proofUrl: payment.proof_url,
        status: payment.status,
      },
    };
  } catch (error) {
    console.error("Error in createManualPaymentAction:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
} 