import { SupabaseClient } from '@supabase/supabase-js';
import { StorageProvider } from '../storage/storage-provider.interface';
import { ManualPaymentService } from './manual-payment.service';
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
        // TODO: Implement Stripe payment service
        throw new Error('Stripe payments not yet implemented');
      default:
        throw new Error(`Unsupported payment type: ${type}`);
    }
  }
} 