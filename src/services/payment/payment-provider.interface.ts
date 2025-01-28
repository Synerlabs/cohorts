import { Payment, PaymentStatus } from './types';

export interface PaymentProviderConfig {
  secretKey: string;
  webhookSecret?: string;
  returnUrl?: string;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentProviderWebhookEvent {
  type: string;
  data: any;
}

export interface PaymentProvider {
  /**
   * Create a payment intent with the provider
   */
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<{
    paymentIntentId: string;
    clientSecret?: string;
    status: string;
  }>;

  /**
   * Handle webhook events from the provider
   */
  handleWebhookEvent(event: PaymentProviderWebhookEvent): Promise<{
    paymentIntentId: string;
    status: string;
    amount?: number;
    metadata?: Record<string, string>;
  }>;

  /**
   * Map provider-specific status to our payment status
   */
  mapProviderStatus(providerStatus: string): PaymentStatus;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
} 