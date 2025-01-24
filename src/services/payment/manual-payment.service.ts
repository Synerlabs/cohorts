import { SupabaseClient } from '@supabase/supabase-js';
import { StorageProvider } from '../storage/storage-provider.interface';
import { PaymentService } from './payment.service.interface';
import { CreateManualPaymentDTO, ManualPayment, Payment, UpdatePaymentDTO } from './types';

export class ManualPaymentService implements PaymentService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly storageProvider: StorageProvider
  ) {}

  async createPayment(data: CreateManualPaymentDTO): Promise<Payment> {
    console.log('Creating manual payment:', {
      orderId: data.orderId,
      amount: data.amount,
      currency: data.currency,
      hasProofFile: !!data.proofFile
    });

    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .insert({
        order_id: data.orderId,
        user_id: data.userId,
        type: 'manual',
        amount: data.amount,
        currency: data.currency,
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment:', paymentError);
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    console.log('Payment record created:', payment.id);

    // Create manual payment record
    const manualPaymentData: any = {};
    
    // If proof file is provided, upload it
    if (data.proofFile) {
      try {
        console.log('Uploading proof file for payment:', payment.id);
        const path = `proof-of-payments/${payment.id}/${data.proofFile.name}`;
        console.log('Upload path:', path);
        
        console.log('File data:', {
          name: data.proofFile.name,
          type: data.proofFile.type,
          base64Length: data.proofFile.base64?.length
        });

        const result = await this.storageProvider.upload(data.proofFile, path);
        console.log('File upload result:', {
          fileId: result.fileId,
          hasUrl: !!result.url
        });
        
        manualPaymentData.proof_file_id = result.fileId;
        manualPaymentData.proof_url = result.url;
      } catch (error: any) {
        console.error('Error uploading proof file:', error);
        // Delete the payment record if file upload fails
        await this.supabase.from('payments').delete().eq('id', payment.id);
        throw new Error(`Failed to upload proof file: ${error.message}`);
      }
    }

    if (data.notes) {
      manualPaymentData.notes = data.notes;
    }

    console.log('Creating manual payment record with data:', {
      paymentId: payment.id,
      hasProofFileId: !!manualPaymentData.proof_file_id,
      hasProofUrl: !!manualPaymentData.proof_url
    });

    const { data: manualPayment, error: manualPaymentError } = await this.supabase
      .from('manual_payments')
      .insert({
        payment_id: payment.id,
        ...manualPaymentData
      })
      .select()
      .single();

    if (manualPaymentError) {
      console.error('Failed to create manual payment:', manualPaymentError);
      // Delete the payment record if manual payment creation fails
      await this.supabase.from('payments').delete().eq('id', payment.id);
      throw new Error(`Failed to create manual payment: ${manualPaymentError.message}`);
    }

    console.log('Manual payment record created successfully');
    return this.mapPayment(payment, manualPayment);
  }

  async getPayment(id: string): Promise<Payment> {
    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .select('*, manual_payments(*)')
      .eq('id', id)
      .single();

    if (paymentError) {
      throw new Error(`Failed to get payment: ${paymentError.message}`);
    }

    return this.mapPayment(payment, payment.manual_payments);
  }

  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    const { data: payments, error: paymentError } = await this.supabase
      .from('payments')
      .select('*, manual_payments(*)')
      .eq('order_id', orderId);

    if (paymentError) {
      throw new Error(`Failed to get payments: ${paymentError.message}`);
    }

    return payments.map(p => this.mapPayment(p, p.manual_payments));
  }

  async getPaymentsByOrgId(orgId: string): Promise<Payment[]> {
    const { data: payments, error: paymentError } = await this.supabase
      .from('payments')
      .select(`
        *,
        manual_payments(*),
        orders!inner(
          product_id,
          products!inner(
            group_id
          )
        )
      `)
      .eq('type', 'manual')
      .eq('orders.products.group_id', orgId);

    if (paymentError) {
      throw new Error(`Failed to get payments: ${paymentError.message}`);
    }

    return payments.map(p => this.mapPayment(p, p.manual_payments));
  }

  async updatePayment(id: string, data: UpdatePaymentDTO): Promise<Payment> {
    const updates: any = {};
    
    if (data.status) {
      updates.status = data.status;
    }

    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select('*, manual_payments(*)')
      .single();

    if (paymentError) {
      throw new Error(`Failed to update payment: ${paymentError.message}`);
    }

    if (data.notes) {
      const { error: manualPaymentError } = await this.supabase
        .from('manual_payments')
        .update({ notes: data.notes })
        .eq('payment_id', id);

      if (manualPaymentError) {
        throw new Error(`Failed to update manual payment: ${manualPaymentError.message}`);
      }
    }

    return this.mapPayment(payment, payment.manual_payments);
  }

  async approvePayment(id: string, notes?: string): Promise<Payment> {
    return this.updatePayment(id, { status: 'approved', notes });
  }

  async rejectPayment(id: string, notes: string): Promise<Payment> {
    return this.updatePayment(id, { status: 'rejected', notes });
  }

  private mapPayment(payment: any, manualPayment: any): ManualPayment {
    return {
      id: payment.id,
      orderId: payment.order_id,
      userId: payment.user_id,
      type: 'manual',
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: new Date(payment.created_at),
      updatedAt: new Date(payment.updated_at),
      proofFileId: manualPayment?.proof_file_id,
      proofUrl: manualPayment?.proof_url,
      notes: manualPayment?.notes,
    };
  }
} 