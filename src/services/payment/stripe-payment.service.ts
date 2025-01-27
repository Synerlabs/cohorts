import { SupabaseClient } from '@supabase/supabase-js';
import { PaymentService } from './payment.service.interface';
import { CreateStripePaymentDTO, GetPaymentsOptions, GetPaymentsResult, Payment, StripePayment, UpdatePaymentDTO } from './types';
import Stripe from 'stripe';

export class StripePaymentService implements PaymentService {
  private stripe: Stripe;

  constructor(
    private readonly supabase: SupabaseClient,
    stripeSecretKey: string
  ) {
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16'
    });
  }

  async createPayment(data: CreateStripePaymentDTO): Promise<Payment> {
    // Create a payment intent with Stripe
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency.toLowerCase(),
      payment_method: data.paymentMethodId,
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/@${data.orgId}/join/payments/confirm`
    });

    // Create payment record in database
    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .insert({
        order_id: data.orderId,
        user_id: data.userId,
        type: 'stripe',
        amount: data.amount,
        currency: data.currency,
        status: this.mapStripeStatus(paymentIntent.status)
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    // Create stripe payment record
    const { error: stripePaymentError } = await this.supabase
      .from('stripe_payments')
      .insert({
        payment_id: payment.id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_payment_method: data.paymentMethodId,
        stripe_status: paymentIntent.status
      });

    if (stripePaymentError) {
      throw new Error(`Failed to create stripe payment: ${stripePaymentError.message}`);
    }

    return this.mapPayment(payment);
  }

  async getPayment(id: string): Promise<Payment> {
    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .select(`
        *,
        stripe_payments(*)
      `)
      .eq('id', id)
      .single();

    if (paymentError) {
      throw new Error(`Failed to get payment: ${paymentError.message}`);
    }

    return this.mapPayment(payment);
  }

  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    const { data: payments, error: paymentError } = await this.supabase
      .from('payments')
      .select(`
        *,
        stripe_payments(*)
      `)
      .eq('order_id', orderId)
      .eq('type', 'stripe');

    if (paymentError) {
      throw new Error(`Failed to get payments: ${paymentError.message}`);
    }

    return payments.map(p => this.mapPayment(p));
  }

  async getPaymentsByOrgId(orgId: string, options: GetPaymentsOptions = {}): Promise<GetPaymentsResult> {
    const {
      page = 1,
      pageSize = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search = ''
    } = options;

    let query = this.supabase
      .from('payments')
      .select(`
        *,
        stripe_payments(*),
        orders!inner(
          product_id,
          products!inner(
            group_id
          )
        )
      `, { count: 'exact' })
      .eq('type', 'stripe')
      .eq('orders.products.group_id', orgId);

    if (search) {
      query = query.or(`
        id.ilike.%${search}%,
        amount::text.ilike.%${search}%,
        currency.ilike.%${search}%,
        status.ilike.%${search}%
      `);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: payments, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get payments: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: payments.map(p => this.mapPayment(p)),
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async updatePayment(id: string, data: UpdatePaymentDTO): Promise<Payment> {
    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .update({
        status: data.status,
        notes: data.notes
      })
      .eq('id', id)
      .select(`
        *,
        stripe_payments(*)
      `)
      .single();

    if (paymentError) {
      throw new Error(`Failed to update payment: ${paymentError.message}`);
    }

    return this.mapPayment(payment);
  }

  async approvePayment(id: string, notes?: string): Promise<Payment> {
    return this.updatePayment(id, { status: 'approved', notes });
  }

  async rejectPayment(id: string, notes: string): Promise<Payment> {
    return this.updatePayment(id, { status: 'rejected', notes });
  }

  private mapPayment(data: any): StripePayment {
    return {
      id: data.id,
      orderId: data.order_id,
      userId: data.user_id,
      type: 'stripe',
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      stripePaymentIntentId: data.stripe_payments?.stripe_payment_intent_id,
      stripePaymentMethod: data.stripe_payments?.stripe_payment_method,
      stripeStatus: data.stripe_payments?.stripe_status,
      uploads: []
    };
  }

  private mapStripeStatus(stripeStatus: string): Payment['status'] {
    switch (stripeStatus) {
      case 'succeeded':
        return 'approved';
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
      case 'processing':
        return 'pending';
      case 'canceled':
        return 'rejected';
      default:
        return 'pending';
    }
  }
} 