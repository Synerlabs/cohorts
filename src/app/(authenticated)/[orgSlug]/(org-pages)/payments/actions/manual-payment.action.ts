"use server";

import { ManualPayment, ManualPaymentService } from "@/services/manual-payment.service";

export type ManualPaymentFormState = {
  success: boolean;
  error?: string;
  data?: ManualPayment;
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

export async function approvePaymentAction(
  prevState: ManualPaymentFormState,
  payload: PaymentActionPayload
): Promise<ManualPaymentFormState> {
  try {
    const result = await ManualPaymentService.approvePayment(
      payload.paymentId,
      payload.userId,
      payload.notes
    );

    if (!result) {
      return { success: false, error: "Failed to approve payment" };
    }

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