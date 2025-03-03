import { SupabaseClient } from '@supabase/supabase-js';
import { StorageProvider } from '../storage/storage-provider.interface';
import { ManualPaymentService } from './manual-payment.service';
import { StripePaymentService } from './stripe-payment.service';
import { XenditPaymentService } from './xendit-payment.service';
import { PaymentService } from './payment.service.interface';
import { PaymentType } from './types';
import { supabaseProvider } from '../storage/supabase.provider';

export class PaymentServiceFactory {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly storageProvider: StorageProvider = supabaseProvider
  ) {}

  createService(type: PaymentType): PaymentService {
    switch (type) {
      case 'manual':
        return new ManualPaymentService(this.supabase, this.storageProvider);
      case 'stripe': {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
          throw new Error('Stripe secret key not configured');
        }
        return new StripePaymentService(this.supabase, stripeSecretKey);
      }
      case 'xendit': {
        const xenditSecretKey = process.env.XENDIT_SECRET_KEY;
        if (!xenditSecretKey) {
          throw new Error('Xendit secret key not configured');
        }
        return new XenditPaymentService();
      }
      default:
        throw new Error(`Unsupported payment type: ${type}`);
    }
  }

  static getProviderConfig(type: PaymentType) {
    switch (type) {
      case 'stripe':
        return {
          secretKey: process.env.STRIPE_SECRET_KEY!,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
          returnUrl: process.env.NEXT_PUBLIC_APP_URL
        };
      case 'xendit':
        return {
          secretKey: process.env.XENDIT_SECRET_KEY!,
          webhookKey: process.env.XENDIT_WEBHOOK_KEY,
          publicKey: process.env.XENDIT_PUBLIC_KEY,
          returnUrl: process.env.NEXT_PUBLIC_APP_URL
        };
      default:
        throw new Error(`No provider config for type: ${type}`);
    }
  }
} 