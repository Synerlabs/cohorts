import { createClient } from "@/lib/utils/supabase/server";
import { StorageSettingsService } from "./storage/storage-settings.service";

export type ManualPaymentStatus = 'pending' | 'approved' | 'rejected';

export interface ManualPayment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  proofFileId?: string;
  proofUrl?: string;
  status: ManualPaymentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

export class ManualPaymentService {
  static async createManualPayment(data: {
    orderId: string;
    amount: number;
    currency: string;
  }): Promise<ManualPayment | null> {
    const supabase = await createClient();
    const { data: payment, error } = await supabase
      .from('manual_payments')
      .insert({
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
      })
      .select()
      .single();

    if (error || !payment) return null;

    return this.mapPayment(payment);
  }

  static async uploadProofOfPayment(
    paymentId: string,
    orgId: string,
    file: File
  ): Promise<ManualPayment | null> {
    // Get storage provider
    const provider = await StorageSettingsService.createStorageProvider(orgId);
    if (!provider) {
      throw new Error('Storage provider not configured');
    }

    // Upload file
    const path = `proof-of-payments/${paymentId}/${file.name}`;
    const result = await provider.upload(file, path);

    // Update payment record
    const supabase = await createClient();
    const { data: payment, error } = await supabase
      .from('manual_payments')
      .update({
        proof_file_id: result.fileId,
        proof_url: result.url,
        status: 'pending',
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error || !payment) return null;

    return this.mapPayment(payment);
  }

  static async approvePayment(
    paymentId: string,
    userId: string,
    notes?: string
  ): Promise<ManualPayment | null> {
    const supabase = await createClient();
    const { data: payment, error } = await supabase
      .from('manual_payments')
      .update({
        status: 'approved',
        notes,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error || !payment) return null;

    return this.mapPayment(payment);
  }

  static async rejectPayment(
    paymentId: string,
    userId: string,
    notes: string
  ): Promise<ManualPayment | null> {
    const supabase = await createClient();
    const { data: payment, error } = await supabase
      .from('manual_payments')
      .update({
        status: 'rejected',
        notes,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error || !payment) return null;

    return this.mapPayment(payment);
  }

  static async getPaymentsByOrderId(orderId: string): Promise<ManualPayment[]> {
    const supabase = await createClient();
    const { data: payments, error } = await supabase
      .from('manual_payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error || !payments) return [];

    return payments.map(this.mapPayment);
  }

  private static mapPayment(data: any): ManualPayment {
    return {
      id: data.id,
      orderId: data.order_id,
      amount: data.amount,
      currency: data.currency,
      proofFileId: data.proof_file_id,
      proofUrl: data.proof_url,
      status: data.status,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
      approvedBy: data.approved_by,
    };
  }
} 