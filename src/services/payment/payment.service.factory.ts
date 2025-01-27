import { SupabaseClient } from '@supabase/supabase-js';
import { StorageProvider } from '../storage/storage-provider.interface';
import { ManualPaymentService } from './manual-payment.service';
import { StripePaymentService } from './stripe-payment.service';
import { PaymentService } from './payment.service.interface';
import { PaymentType } from './types';

export class PaymentServiceFactory {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly storageProvider: StorageProvider
  ) {}

  createService(type: PaymentType): PaymentService {
    switch (type) {
      case 'manual':
        return new ManualPaymentService(this.supabase, this.storageProvider);
      case 'stripe':
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
          throw new Error('Stripe secret key not configured');
        }
        return new StripePaymentService(this.supabase, stripeSecretKey);
      default:
        throw new Error(`Unsupported payment type: ${type}`);
    }
  }
} 