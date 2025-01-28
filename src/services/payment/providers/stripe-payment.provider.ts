import Stripe from 'stripe';
import { PaymentProvider, PaymentProviderConfig, CreatePaymentIntentParams, PaymentProviderWebhookEvent } from '../payment-provider.interface';
import { PaymentStatus } from '../types';

export class StripePaymentProvider implements PaymentProvider {
  private stripe: Stripe;
  private webhookSecret?: string;
  private returnUrl?: string;

  constructor(config: PaymentProviderConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2024-12-18.acacia'
    });
    this.webhookSecret = config.webhookSecret;
    this.returnUrl = config.returnUrl;
  }

  async createPaymentIntent(params: CreatePaymentIntentParams) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      payment_method: params.paymentMethodId,
      confirm: !!params.paymentMethodId,
      metadata: params.metadata,
      return_url: this.returnUrl
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
      status: paymentIntent.status
    };
  }

  async handleWebhookEvent(event: PaymentProviderWebhookEvent) {
    const stripeEvent = event.data as Stripe.Event;
    
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded': {
        // Primary success event - payment is fully completed
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
        return {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          metadata: paymentIntent.metadata
        };
      }

      case 'payment_intent.payment_failed': {
        // Payment attempt failed
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
        return {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          metadata: paymentIntent.metadata
        };
      }

      case 'payment_intent.canceled': {
        // Payment was canceled
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
        return {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          metadata: paymentIntent.metadata
        };
      }

      case 'charge.succeeded': {
        // Individual charge succeeded - get parent PaymentIntent
        const charge = stripeEvent.data.object as Stripe.Charge;
        if (!charge.payment_intent) {
          throw new Error('Charge has no associated PaymentIntent');
        }
        // Return the charge status but include the PaymentIntent ID
        return {
          paymentIntentId: charge.payment_intent as string,
          status: 'succeeded', // Map charge status to PaymentIntent status
          amount: charge.amount,
          metadata: charge.metadata
        };
      }

      case 'charge.failed': {
        // Individual charge failed - get parent PaymentIntent
        const charge = stripeEvent.data.object as Stripe.Charge;
        if (!charge.payment_intent) {
          throw new Error('Charge has no associated PaymentIntent');
        }
        return {
          paymentIntentId: charge.payment_intent as string,
          status: 'payment_failed', // Map to PaymentIntent failed status
          amount: charge.amount,
          metadata: charge.metadata
        };
      }

      default:
        throw new Error(`Unhandled event type: ${stripeEvent.type}`);
    }
  }

  mapProviderStatus(providerStatus: string): PaymentStatus {
    switch (providerStatus) {
      case 'succeeded':
        return 'paid';
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
      case 'processing':
        return 'pending';
      case 'canceled':
      case 'payment_failed':
        return 'rejected';
      default:
        return 'pending';
    }
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    try {
      this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
      return true;
    } catch (err) {
      return false;
    }
  }
} 
