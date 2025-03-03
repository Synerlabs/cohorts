import { PaymentService } from './payment.service.interface';
import { 
  Payment,
  CreateXenditPaymentDTO,
  GetPaymentsResult,
  GetPaymentsOptions,
  UpdatePaymentDTO,
  XenditPayment
} from './types';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { XenditProvider } from '@/providers/xendit.provider';
import { OrderService } from '../order.service';

/**
 * Xendit Payment Service
 * 
 * Service for handling Xendit payments
 */
export class XenditPaymentService implements PaymentService {
  private supabase: any;
  private provider;

  constructor() {
    this.supabase = createServiceRoleClient();
    this.provider = new XenditProvider();
  }

  /**
   * Create a new Xendit payment
   */
  async createPayment(data: CreateXenditPaymentDTO): Promise<Payment> {
    try {
      // First, get the connected account for this organization
      const { data: connectedAccount, error: accountError } = await this.supabase
        .from('xendit_connected_accounts')
        .select('account_id, is_active')
        .eq('org_id', data.orgId)
        .eq('is_active', true)
        .single();

      if (accountError || !connectedAccount) {
        throw new Error('No active Xendit account available for this organization');
      }

      // Calculate platform fee (e.g., 5%)
      const platformFeePercent = 5;
      const platformFee = Math.round((data.amount * platformFeePercent) / 100);

      // Create a Xendit invoice with payment splitting
      const result = await this.provider.createInvoice({
        externalId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        description: `Payment for Order #${data.orderId}`,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        successRedirectUrl: data.successUrl,
        failureRedirectUrl: data.failureUrl,
        forUserId: connectedAccount.account_id, // Xendit business ID for payment splitting
        fees: [{
          type: 'platform-fee',
          value: platformFee
        }]
      });

      // Create payment record in database
      const { data: payment, error: paymentError } = await this.supabase
        .from('payments')
        .insert({
          order_id: data.orderId,
          user_id: data.userId,
          group_id: data.orgId,
          type: 'xendit',
          amount: data.amount,
          currency: data.currency,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (paymentError) {
        throw new Error(`Failed to create payment record: ${paymentError.message}`);
      }

      // Create xendit payment record
      const { error: xenditPaymentError } = await this.supabase
        .from('xendit_payments')
        .insert({
          payment_id: payment.id,
          xendit_invoice_id: result.id,
          xendit_status: result.status || 'PENDING',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (xenditPaymentError) {
        throw new Error(`Failed to create xendit payment record: ${xenditPaymentError.message}`);
      }

      return {
        id: payment.id,
        orderId: payment.order_id,
        userId: payment.user_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        type: 'xendit' as const,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
        xenditInvoiceId: result.id || '',
        xenditStatus: result.status || 'PENDING',
        uploads: []
      };
    } catch (error: any) {
      console.error('Failed to create Xendit payment:', error);
      throw new Error(`Failed to create Xendit payment: ${error.message}`);
    }
  }

  /**
   * Get a payment by ID
   */
  async getPayment(id: string): Promise<Payment> {
    const { data, error } = await this.supabase
      .from('payments')
      .select(`
        *,
        xendit_payments(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to get payment: ${error.message}`);
    }

    return this.mapPayment(data);
  }

  /**
   * Get payments by order ID
   */
  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select(`
        *,
        xendit_payments(*)
      `)
      .eq('order_id', orderId);

    if (error) {
      throw new Error(`Failed to get payments by order ID: ${error.message}`);
    }

    return (data || []).map(this.mapPayment.bind(this));
  }

  /**
   * Get payments by organization ID with pagination
   */
  async getPaymentsByOrgId(
    orgId: string,
    options: GetPaymentsOptions = {}
  ): Promise<GetPaymentsResult> {
    const {
      page = 1,
      pageSize = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search = ''
    } = options;

    // Calculate pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query
    let query = this.supabase
      .from('payments')
      .select(`
        *,
        xendit_payments(*)
      `, { count: 'exact' })
      .eq('group_id', orgId)
      .eq('type', 'xendit')
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    // Add search if provided
    if (search) {
      query = query.or(`id.ilike.%${search}%,order_id.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get payments by org ID: ${error.message}`);
    }

    return {
      data: (data || []).map(this.mapPayment.bind(this)),
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  }

  /**
   * Update a payment
   */
  async updatePayment(id: string, data: UpdatePaymentDTO): Promise<Payment> {
    // First get current payment
    const { data: currentPayment, error: getError } = await this.supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (getError) {
      throw new Error(`Failed to get current payment: ${getError.message}`);
    }

    // Update payment fields
    const updateData: any = {
      status: data.status,
      notes: data.notes,
      updated_at: new Date().toISOString()
    };

    if (data.status === 'paid' && !currentPayment.approved_at) {
      updateData.approved_at = new Date().toISOString();
      // The approved_by field is not included in UpdatePaymentDTO,
      // so we won't set it here
    }

    // Update the payment
    const { data: updatedPayment, error: updateError } = await this.supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        xendit_payments(*)
      `)
      .single();

    if (updateError) {
      throw new Error(`Failed to update payment: ${updateError.message}`);
    }

    return this.mapPayment(updatedPayment);
  }

  /**
   * Approve a payment
   */
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
    const updatedPayment = await this.updatePayment(id, { 
      status: 'paid', 
      notes 
    });

    // Update order status based on all payments
    await OrderService.updateOrderStatusFromPayments(payment.order_id);

    return updatedPayment;
  }

  /**
   * Reject a payment
   */
  async rejectPayment(id: string, notes: string): Promise<Payment> {
    return await this.updatePayment(id, { 
      status: 'rejected', 
      notes 
    });
  }

  /**
   * Map database payment record to Payment type
   */
  private mapPayment(data: any): XenditPayment {
    return {
      id: data.id,
      orderId: data.order_id,
      userId: data.user_id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      type: 'xendit' as const,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      xenditInvoiceId: data.xendit_invoice_id,
      xenditStatus: data.xendit_status,
      paymentMethod: data.payment_method || undefined,
      uploads: data.uploads || []
    };
  }
} 