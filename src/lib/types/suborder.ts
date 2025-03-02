import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database.types';
import { MembershipActivationService } from '@/services/membership-activation.service';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { MembershipActivationType } from '@/lib/types/membership';

export type SuborderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type SuborderType = 'membership' | 'product' | 'event' | 'promotion';

export interface ISuborder extends ISuborderData {
  metadata: Record<string, any>;
}

export interface IMembershipSuborder extends ISuborder {
  metadata: {
    application_id: string;
    group_user_id?: string;
    start_date?: string;
    end_date?: string;
  };
}

export function isMembershipSuborder(
  suborder: ISuborder,
  product: { type: string }
): suborder is IMembershipSuborder {
  return product.type === 'membership';
}

export class SuborderError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'SuborderError';
  }
}

export class ProcessingError extends SuborderError {
  constructor(message: string, details?: any) {
    super(message, 'PROCESSING_ERROR', details);
    this.name = 'ProcessingError';
  }
}

export class ValidationError extends SuborderError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export interface ISuborderData {
  id: string;
  order_id: string;
  status: SuborderStatus;
  type: SuborderType;
  product_id: string;
  product?: {
    id: string;
    type: string;
    [key: string]: any;
  };
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  failed_at?: string;
  cancelled_at?: string;
}

export abstract class Suborder {
  protected data: ISuborderData;
  protected supabase: SupabaseClient<Database>;

  constructor(data: ISuborderData, supabase: SupabaseClient<Database>) {
    this.validateData(data);
    this.data = data;
    this.supabase = supabase;
  }

  protected validateData(data: ISuborderData): void {
    if (!data.id) throw new ValidationError('Suborder ID is required');
    if (!data.order_id) throw new ValidationError('Order ID is required');
    if (!data.type) throw new ValidationError('Suborder type is required');
    if (!data.product_id) throw new ValidationError('Product ID is required');
    if (typeof data.amount !== 'number') throw new ValidationError('Amount must be a number');
    if (!data.currency) throw new ValidationError('Currency is required');
  }

  abstract process(): Promise<Suborder>;

  protected async updateStatus(status: SuborderStatus, metadata?: Record<string, any>): Promise<void> {
    const now = new Date().toISOString();
    const updates: Partial<ISuborderData> = {
      status,
      updated_at: now,
      metadata: { ...this.data.metadata, ...metadata }
    };

    // Add timestamp based on status
    if (status === 'completed') updates.completed_at = now;
    if (status === 'failed') updates.failed_at = now;
    if (status === 'cancelled') updates.cancelled_at = now;

    const { error } = await this.supabase
      .from('suborders')
      .update(updates)
      .eq('id', this.data.id);

    if (error) throw new ProcessingError(`Failed to update suborder status: ${error.message}`, { error });
    
    // Update local data
    this.data = { ...this.data, ...updates };
  }

  protected async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
    try {
      // Execute the operation directly without transaction RPC calls
      return await operation();
    } catch (error) {
      // Just rethrow the error
      throw error;
    }
  }

  // Getters
  get id(): string { return this.data.id; }
  get orderId(): string { return this.data.order_id; }
  get status(): SuborderStatus { return this.data.status; }
  get type(): SuborderType { return this.data.type; }
  get productId(): string { return this.data.product_id; }
  get product() { return this.data.product; }
  get amount(): number { return this.data.amount; }
  get currency(): string { return this.data.currency; }
  get metadata() { return this.data.metadata || {}; }
  get createdAt(): Date { return new Date(this.data.created_at); }
  get updatedAt(): Date { return new Date(this.data.updated_at); }
  get completedAt(): Date | null { return this.data.completed_at ? new Date(this.data.completed_at) : null; }
  get failedAt(): Date | null { return this.data.failed_at ? new Date(this.data.failed_at) : null; }
  get cancelledAt(): Date | null { return this.data.cancelled_at ? new Date(this.data.cancelled_at) : null; }

  // Status checks
  isCompleted(): boolean { return this.status === 'completed'; }
  isFailed(): boolean { return this.status === 'failed'; }
  isCancelled(): boolean { return this.status === 'cancelled'; }
  isProcessing(): boolean { return this.status === 'processing'; }
  isPending(): boolean { return this.status === 'pending'; }
  isFinalized(): boolean { return this.isCompleted() || this.isFailed() || this.isCancelled(); }

  // Utility methods
  toJSON(): ISuborderData {
    return { ...this.data };
  }

  toString(): string {
    return `Suborder(${this.id}, ${this.type}, ${this.status})`;
  }
}

interface MembershipTier {
  duration_months: number;
  activation_type: string;
  product_id: string;
}

interface ApplicationWithRelations {
  id: string;
  group_user_id: string;
  tier_id: string;
  status: string;
  tier: {
    id: string;
    membership_tiers: MembershipTier[];
  };
  group_user: {
    id: string;
    user_id: string;
    group_id: string;
  };
}

export class MembershipSuborder extends Suborder {
  async process(): Promise<Suborder> {
    console.log('🔄 Processing membership suborder:', this.id);
    
    if (!this.metadata.application_id) {
      throw new ValidationError('Membership suborder is missing application_id');
    }

    return this.withTransaction(async () => {
      try {
        await this.updateStatus('processing');
        
        // Process the membership
        const processedApp = await MembershipActivationService.processFromSuborder(
          this.metadata.application_id,
          this.orderId
        );
        
        // Get the activation type from the database
        const { data: tierData } = await this.supabase
          .from('membership_applications_view')
          .select('activation_type')
          .eq('application_id', this.metadata.application_id)
          .single();
        
        const activationType = tierData?.activation_type;
        console.log('🔍 Processing membership with activation type:', activationType);
        
        let applicationStatus = processedApp?.status;
        
        // For form_then_payment_then_review, we expect the status to be 'pending' after payment
        if (activationType === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW) {
          console.log('ℹ️ Skipping standard verification for form_then_payment_then_review activation type');
          
          // Verify the application exists and has a valid status
          const { data: appData, error: appError } = await this.supabase
            .from('applications')
            .select('status')
            .eq('id', this.metadata.application_id)
            .single();
            
          if (appError || !appData) {
            console.error('❌ Application not found or error:', appError);
            throw new Error(`Application verification failed: ${appError?.message || 'Application not found'}`);
          }
          
          if (appData.status !== 'pending') {
            console.error('❌ Application status is not pending after payment for form_then_payment_then_review:', appData.status);
            throw new Error(`Application status should be 'pending' after payment for form_then_payment_then_review, but got '${appData.status}'`);
          }
          
          applicationStatus = appData.status;
          console.log('✅ Application status verified as pending for form_then_payment_then_review');
        } else {
          // For all other activation types, use the standard verification
          await this.verifyApplicationStatus();
        }
        
        // Update status to completed
        await this.updateStatus('completed', {
          completedAt: new Date().toISOString(),
          activationType,
          applicationStatus
        });
        
        return this;
      } catch (error) {
        console.error('❌ Error processing membership suborder:', error);
        await this.updateStatus('failed', {
          error: error instanceof Error ? error.message : String(error),
          failedAt: new Date().toISOString()
        });
        throw error;
      }
    });
  }

  private async verifyApplicationStatus(): Promise<void> {
    // First get just the application status
    const { data: verifyApp, error: verifyAppError } = await this.supabase
      .from('applications')
      .select('status')
      .eq('id', this.metadata.application_id)
      .single();

    if (verifyAppError || !verifyApp) {
      throw new ProcessingError('Failed to fetch application status', {
        applicationId: this.metadata.application_id,
        error: verifyAppError?.message
      });
    }

    // Now get the activation type separately
    const { data: tierData, error: tierError } = await this.supabase
      .from('membership_applications_view')
      .select('activation_type')
      .eq('id', this.metadata.application_id)
      .single();

    if (tierError) {
      console.error('Error fetching activation type:', tierError);
      // If we can't get the activation type, fall back to requiring 'approved' status
      if (verifyApp.status !== 'approved') {
        throw new ProcessingError('Failed to verify application status', {
          applicationId: this.metadata.application_id,
          status: verifyApp.status,
          expectedStatus: 'approved'
        });
      }
      return;
    }

    const activationType = tierData?.activation_type;
    console.log(`Verifying application status: ${verifyApp.status}, activation type: ${activationType}`);

    // Check for valid status based on activation type
    const validStatus = this.getValidStatusForActivationType(activationType || undefined, verifyApp.status);
    
    if (!validStatus) {
      throw new ProcessingError('Invalid application status for activation type', {
        applicationId: this.metadata.application_id,
        status: verifyApp.status,
        activationType,
        validStatuses: this.getValidStatusesForActivationType(activationType || undefined)
      });
    }
  }

  private getValidStatusForActivationType(activationType: string | undefined, status: string): boolean {
    if (!activationType) {
      // If activation type is unknown, only 'approved' is valid
      return status === 'approved';
    }

    switch (activationType) {
      case 'form_then_payment_then_review':
        // After payment, status should be 'pending'
        return status === 'pending';
        
      case 'review_then_payment':
      case 'form_then_review_then_payment':
        // After review but before payment, status should be 'pending_payment'
        return status === 'pending_payment' || status === 'approved';
        
      default:
        // For all other types, status should be 'approved' after processing
        return status === 'approved';
    }
  }

  private getValidStatusesForActivationType(activationType: string | undefined): string[] {
    if (!activationType) {
      return ['approved'];
    }

    switch (activationType) {
      case 'form_then_payment_then_review':
        return ['pending'];
        
      case 'review_then_payment':
      case 'form_then_review_then_payment':
        return ['pending_payment', 'approved'];
        
      default:
        return ['approved'];
    }
  }

  // Additional membership-specific getters
  get applicationId(): string | undefined { return this.metadata.application_id; }
  get groupUserId(): string | undefined { return this.metadata.group_user_id; }
  get startDate(): Date | null { return this.metadata.start_date ? new Date(this.metadata.start_date) : null; }
  get endDate(): Date | null { return this.metadata.end_date ? new Date(this.metadata.end_date) : null; }
}

export class SuborderFactory {
  static create(data: ISuborderData, supabase: SupabaseClient<Database>): Suborder {
    switch (data.type) {
      case 'membership':
        return new MembershipSuborder(data, supabase);
      default:
        throw new ValidationError(`Unknown suborder type: ${data.type}`);
    }
  }
} 
