import { SupabaseClient } from '@supabase/supabase-js';
import { StorageProvider } from '../storage/storage-provider.interface';
import { PaymentService } from './payment.service.interface';
import { CreateManualPaymentDTO, ManualPayment, Payment, UpdatePaymentDTO, Upload } from './types';
import { OrderService } from '../order.service';

interface GetPaymentsOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

interface GetPaymentsResult {
  data: Payment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

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
      fileCount: data.proofFiles?.length
    });

    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .insert({
        order_id: data.orderId,
        user_id: data.userId,
        group_id: data.orgId,
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

    const uploads: Upload[] = [];
    
    // If proof files are provided, upload them
    if (data.proofFiles?.length) {
      try {
        for (const file of data.proofFiles) {
          console.log('Uploading proof file for payment:', payment.id);
          const path = `manual-payments/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}/${crypto.randomUUID()}`;
          console.log('Upload path:', path);
          
          console.log('File data:', {
            name: file.name,
            type: file.type,
            base64Length: file.base64?.length
          });

          const result = await this.storageProvider.upload(file, path);
          console.log('File upload result:', {
            fileId: result.fileId,
            hasUrl: !!result.url
          });

          // Create upload record
          const { data: upload, error: uploadError } = await this.supabase
            .from('uploads')
            .insert({
              module: 'manual-payments',
              original_filename: file.name,
              storage_path: result.storagePath,
              storage_provider: 'google-drive',
              file_url: result.url,
              file_id: result.fileId
            })
            .select()
            .single();

          if (uploadError) {
            throw new Error(`Failed to create upload record: ${uploadError.message}`);
          }

          // Create payment_uploads record
          const { error: paymentUploadError } = await this.supabase
            .from('payment_uploads')
            .insert({
              payment_id: payment.id,
              upload_id: upload.id
            });

          if (paymentUploadError) {
            throw new Error(`Failed to create payment_upload record: ${paymentUploadError.message}`);
          }

          uploads.push({
            id: upload.id,
            module: upload.module,
            originalFilename: upload.original_filename,
            storagePath: upload.storage_path,
            storageProvider: upload.storage_provider,
            fileUrl: upload.file_url,
            fileId: upload.file_id,
            createdAt: new Date(upload.created_at),
            updatedAt: new Date(upload.updated_at)
          });
        }
      } catch (error: any) {
        console.error('Error uploading proof files:', error);
        // Delete the payment record if file upload fails
        await this.supabase.from('payments').delete().eq('id', payment.id);
        throw new Error(`Failed to upload proof files: ${error.message}`);
      }
    }

    // Create manual payment record with notes if provided
    const { data: manualPayment, error: manualPaymentError } = await this.supabase
      .from('manual_payments')
      .insert({
        payment_id: payment.id,
        notes: data.notes
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
    return {
      ...this.mapPayment(payment, manualPayment),
      uploads
    };
  }

  async getPayment(id: string): Promise<Payment> {
    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .select(`
        *,
        manual_payments(*),
        payment_uploads(
          upload:uploads(*)
        )
      `)
      .eq('id', id)
      .single();

    if (paymentError) {
      throw new Error(`Failed to get payment: ${paymentError.message}`);
    }

    return this.mapPaymentWithUploads(payment);
  }

  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    const { data: payments, error: paymentError } = await this.supabase
      .from('payments')
      .select(`
        *,
        manual_payments(*),
        payment_uploads(
          upload:uploads(*)
        )
      `)
      .eq('order_id', orderId);

    if (paymentError) {
      throw new Error(`Failed to get payments: ${paymentError.message}`);
    }

    return payments.map(p => this.mapPaymentWithUploads(p));
  }

  async getPaymentsByOrgId(orgId: string, options: GetPaymentsOptions = {}): Promise<GetPaymentsResult> {
    const {
      page = 1,
      pageSize = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search = ''
    } = options;

    // Start building the query
    let query = this.supabase
      .from('payments')
      .select(`
        *,
        manual_payments(*),
        payment_uploads(
          upload:uploads(*)
        ),
        orders!inner(
          product_id,
          products!inner(
            group_id
          )
        )
      `, { count: 'exact' })
      .eq('type', 'manual')
      .eq('orders.products.group_id', orgId);

    // Add search if provided
    if (search) {
      query = query.or(`
        id.ilike.%${search}%,
        amount::text.ilike.%${search}%,
        currency.ilike.%${search}%,
        status.ilike.%${search}%,
        manual_payments.notes.ilike.%${search}%
      `);
    }

    // Add sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Add pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data: payments, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get payments: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: payments.map(p => this.mapPaymentWithUploads(p)),
      total,
      page,
      pageSize,
      totalPages
    };
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
      .select(`
        *,
        manual_payments(*),
        payment_uploads(
          upload:uploads(*)
        )
      `)
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

    return this.mapPaymentWithUploads(payment);
  }

  async approvePayment(id: string, notes?: string): Promise<Payment> {
    // First get the payment to get the order ID
    const { data: payment, error: getError } = await this.supabase
      .from('payments')
      .select('order_id')
      .eq('id', id)
      .single();

    if (getError || !payment) {
      throw new Error(`Failed to get payment: ${getError?.message}`);
    }

    // Update payment status to paid
    const updatedPayment = await this.updatePayment(id, { status: 'paid', notes });

    // Update order status based on all payments
    await OrderService.updateOrderStatusFromPayments(payment.order_id);

    return updatedPayment;
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
      notes: manualPayment?.notes,
      uploads: []
    };
  }

  private mapPaymentWithUploads(payment: any): ManualPayment {
    const uploads: Upload[] = (payment.payment_uploads || []).map((pu: any) => ({
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

    return {
      ...this.mapPayment(payment, payment.manual_payments),
      uploads
    };
  }
} 