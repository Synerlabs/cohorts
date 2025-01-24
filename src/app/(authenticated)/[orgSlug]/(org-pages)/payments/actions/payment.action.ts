'use server';

import { Payment, PaymentService } from "@/services/payment.service";
import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { createStorageProvider } from "@/services/storage/storage-settings.service";
import { revalidatePath } from "next/cache";
import { PaymentServiceFactory } from '@/services/payment/payment.service.factory';
import { CreateManualPaymentDTO, PaymentStatus, PaymentActionPayload } from '@/services/payment/types';

export interface PaymentFormState {
  success: boolean;
  error?: string;
  data?: any;
}

export async function approvePaymentAction(
  prevState: PaymentFormState,
  payload: PaymentActionPayload
): Promise<PaymentFormState> {
  try {
    const supabase = await createServiceRoleClient();
    const provider = await createStorageProvider(payload.orgId);
    if (!provider) {
      return {
        success: false,
        error: 'Storage provider not configured',
      };
    }
    
    const paymentServiceFactory = new PaymentServiceFactory(supabase, provider);
    const paymentService = paymentServiceFactory.createService('manual');

    const payment = await paymentService.approvePayment(payload.paymentId, payload.notes);

    // Revalidate the payments page
    revalidatePath(`/@${payload.orgId}/payments`);

    return {
      success: true,
      data: payment,
    };
  } catch (error: any) {
    console.error("Error in approvePaymentAction:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

export async function rejectPaymentAction(
  prevState: PaymentFormState,
  payload: PaymentActionPayload & { notes: string }
): Promise<PaymentFormState> {
  try {
    const supabase = await createServiceRoleClient();
    const provider = await createStorageProvider(payload.orgId);
    if (!provider) {
      return {
        success: false,
        error: 'Storage provider not configured',
      };
    }
    
    const paymentServiceFactory = new PaymentServiceFactory(supabase, provider);
    const paymentService = paymentServiceFactory.createService('manual');

    const payment = await paymentService.rejectPayment(payload.paymentId, payload.notes);

    // Revalidate the payments page
    revalidatePath(`/@${payload.orgId}/payments`);

    return {
      success: true,
      data: payment,
    };
  } catch (error: any) {
    console.error("Error in rejectPaymentAction:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

export async function getPaymentsByOrgIdAction(orgId: string): Promise<PaymentFormState> {
  try {
    const supabase = await createServiceRoleClient();
    const provider = await createStorageProvider(orgId);
    if (!provider) {
      return {
        success: false,
        error: 'Storage provider not configured',
      };
    }
    
    const paymentServiceFactory = new PaymentServiceFactory(supabase, provider);
    const paymentService = paymentServiceFactory.createService('manual');

    const payments = await paymentService.getPaymentsByOrgId(orgId);

    return {
      success: true,
      data: payments,
    };
  } catch (error: any) {
    console.error("Error in getPaymentsByOrgIdAction:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

export async function completeApplicationPayment(orderId: string) {
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
  payload: CreateManualPaymentDTO
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

    // Get storage provider
    const provider = await createStorageProvider(payload.orgId);
    if (!provider) {
      console.error('Storage provider not configured for org:', payload.orgId);
      return {
        success: false,
        error: 'Storage provider not configured'
      };
    }

    // Create payment service
    const paymentServiceFactory = new PaymentServiceFactory(supabase, provider);
    const paymentService = paymentServiceFactory.createService('manual');

    // Create the payment
    const payment = await paymentService.createPayment({
      ...payload,
      userId: user.id,
    });

    // Revalidate the payments page
    revalidatePath(`/@${payload.orgId}/payments`);

    return {
      success: true,
      data: payment,
    };
  } catch (error: any) {
    console.error("Error in createPaymentAction:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
} 