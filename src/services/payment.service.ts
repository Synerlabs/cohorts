import { createServiceRoleClient } from "@/lib/utils/supabase/server";

export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentType = 'manual' | 'stripe';

export interface Upload {
  id: string;
  module: string;
  originalFilename: string;
  storagePath: string;
  storageProvider: string;
  fileUrl: string;
  fileId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BasePayment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  type: PaymentType;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  uploads: Upload[];
}

export interface ManualPayment extends BasePayment {
  type: 'manual';
}

export interface StripePayment extends BasePayment {
  type: 'stripe';
  stripePaymentIntentId: string;
  stripeClientSecret?: string;
}

export type Payment = ManualPayment | StripePayment;

export class PaymentService {
  static async getPaymentsByOrgId(orgId: string): Promise<Payment[]> {
    const supabase = await createServiceRoleClient();
    
    // Get all payments for orders in this organization with their uploads
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders(
          *,
          product:products(*)
        ),
        payment_uploads(
          upload:uploads(*)
        )
      `)
      .eq('orders.products.group_id', orgId)
      .order('created_at', { ascending: false });

    if (error || !payments) {
      console.error('Error loading payments:', error);
      return [];
    }

    return payments.map(this.mapPayment);
  }

  static async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    const supabase = await createServiceRoleClient();
    
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        payment_uploads(
          upload:uploads(*)
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error || !payments) {
      console.error('Error loading payments:', error);
      return [];
    }

    return payments.map(this.mapPayment);
  }

  static async approvePayment(
    paymentId: string,
    userId: string,
    notes?: string
  ): Promise<Payment | null> {
    const supabase = await createServiceRoleClient();
    
    const { data: payment, error } = await supabase
      .from('payments')
      .update({
        status: 'approved',
        notes,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select(`
        *,
        payment_uploads(
          upload:uploads(*)
        )
      `)
      .single();

    if (error || !payment) {
      console.error('Error approving payment:', error);
      return null;
    }

    return this.mapPayment(payment);
  }

  static async rejectPayment(
    paymentId: string,
    userId: string,
    notes: string
  ): Promise<Payment | null> {
    const supabase = await createServiceRoleClient();
    
    const { data: payment, error } = await supabase
      .from('payments')
      .update({
        status: 'rejected',
        notes,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select(`
        *,
        payment_uploads(
          upload:uploads(*)
        )
      `)
      .single();

    if (error || !payment) {
      console.error('Error rejecting payment:', error);
      return null;
    }

    return this.mapPayment(payment);
  }

  static mapPayment(data: any): Payment {
    const uploads: Upload[] = (data.payment_uploads || []).map((pu: any) => ({
      id: pu.upload.id,
      module: pu.upload.module,
      originalFilename: pu.upload.original_filename,
      storagePath: pu.upload.storage_path,
      storageProvider: pu.upload.storage_provider,
      fileUrl: pu.upload.file_url,
      fileId: pu.upload.file_id,
      createdAt: new Date(pu.upload.created_at),
      updatedAt: new Date(pu.upload.updated_at)
    }));

    const basePayment = {
      id: data.id,
      orderId: data.order_id,
      userId: data.user_id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      type: data.type,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
      approvedBy: data.approved_by,
      uploads
    };

    switch (data.type) {
      case 'manual':
        return {
          ...basePayment,
          type: 'manual' as const,
        };
      case 'stripe':
        return {
          ...basePayment,
          type: 'stripe' as const,
          stripePaymentIntentId: data.stripe_payment_intent_id,
          stripeClientSecret: data.stripe_client_secret,
        };
      default:
        throw new Error(`Unknown payment type: ${data.type}`);
    }
  }
} 