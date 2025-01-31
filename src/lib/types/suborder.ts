import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database.types';

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

export class ValidationError extends SuborderError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class ProcessingError extends SuborderError {
  constructor(message: string, details?: any) {
    super(message, 'PROCESSING_ERROR', details);
    this.name = 'ProcessingError';
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
      await this.supabase.rpc('begin_transaction');
      const result = await operation();
      await this.supabase.rpc('commit_transaction');
      return result;
    } catch (error) {
      await this.supabase.rpc('rollback_transaction');
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
      throw new ValidationError('No application ID found in suborder metadata');
    }

    return this.withTransaction(async () => {
      try {
        await this.updateStatus('processing');
        const now = new Date().toISOString();

        // Get application details including tier information and group user
        const { data: application, error: getAppError } = await this.supabase
          .from('applications')
          .select(`
            *,
            tier:tier_id(
              *,
              membership_tiers!inner(*)
            ),
            group_user:group_user_id(
              id,
              user_id,
              group_id
            )
          `)
          .eq('id', this.metadata.application_id)
          .single();

        if (getAppError || !application) {
          console.error('❌ Failed to get application:', { 
            error: getAppError,
            applicationId: this.metadata.application_id 
          });
          throw new ProcessingError(
            `Failed to get application details: ${getAppError?.message || 'Application not found'}`,
            { applicationId: this.metadata.application_id }
          );
        }

        const typedApplication = application as unknown as ApplicationWithRelations;

        console.log('✅ Found application:', {
          applicationId: typedApplication.id,
          groupUserId: typedApplication.group_user_id,
          tierId: typedApplication.tier_id,
          status: typedApplication.status
        });

        // Calculate membership dates
        const startDate = new Date();
        const durationMonths = typedApplication.tier?.membership_tiers?.[0]?.duration_months || 12;
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + durationMonths);

        console.log('📅 Calculated membership dates:', {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          durationMonths
        });

        // Create membership record
        console.log('🔄 Creating membership record...', {
          applicationId: typedApplication.id,
          groupUserId: typedApplication.group_user_id
        });

        // Check if membership already exists
        const { data: existingMembership, error: existingError } = await this.supabase
          .from('memberships')
          .select('group_user_id, order_id')
          .eq('group_user_id', typedApplication.group_user_id)
          .eq('status', 'active')
          .single();

        if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('❌ Failed to check existing membership:', {
            error: existingError,
            groupUserId: typedApplication.group_user_id
          });
          throw new ProcessingError(`Failed to check existing membership: ${existingError.message}`);
        }

        if (existingMembership) {
          console.log('⚠️ Active membership already exists:', {
            groupUserId: typedApplication.group_user_id,
            orderId: existingMembership.order_id
          });
          // Skip creating new membership but continue with other steps
        } else {
          const { error: membershipError } = await this.supabase
            .from('memberships')
            .insert({
              group_user_id: typedApplication.group_user_id,
              order_id: this.orderId,
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              status: 'active',
              tier_id: typedApplication.tier_id
            });

          if (membershipError) {
            console.error('❌ Failed to create membership:', {
              error: membershipError,
              applicationId: typedApplication.id
            });
            throw new ProcessingError(`Failed to create membership: ${membershipError.message}`);
          }

          console.log('✅ Created membership record');
        }

        // Update application status
        console.log('🔄 Updating application status to approved...');
        
        const { data: updatedApp, error: appError } = await this.supabase
          .from('applications')
          .update({
            status: 'approved',
            approved_at: now,
            updated_at: now
          })
          .eq('id', this.metadata.application_id)
          .select('group_user_id, status')
          .single();

        if (appError || !updatedApp) {
          throw new ProcessingError(
            `Failed to update application: ${appError?.message || 'Application not found'}`,
            { applicationId: this.metadata.application_id }
          );
        }

        if (updatedApp.status !== 'approved') {
          throw new ProcessingError('Failed to update application status');
        }

        console.log('✅ Updated application status:', {
          applicationId: typedApplication.id,
          status: updatedApp.status
        });

        // Update metadata with group_user_id if needed
        if (updatedApp.group_user_id && !this.metadata.group_user_id) {
          console.log('🔄 Updating suborder metadata with group_user_id:', updatedApp.group_user_id);
          await this.updateStatus('processing', { group_user_id: updatedApp.group_user_id });
        }

        // Activate group user
        if (updatedApp.group_user_id) {
          await this.activateGroupUser(updatedApp.group_user_id);
          await this.verifyGroupUserActivation(updatedApp.group_user_id);
        }

        await this.verifyApplicationStatus();
        await this.updateStatus('completed', { completedAt: now });
        return this;

      } catch (error) {
        console.error('❌ Failed to process membership suborder:', error);
        await this.updateStatus('failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString()
        });
        throw error;
      }
    });
  }

  private async activateGroupUser(groupUserId: string): Promise<void> {
    const { error: userError } = await this.supabase
      .from('group_users')
      .update({
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupUserId);

    if (userError) {
      throw new ProcessingError(`Failed to activate group user: ${userError.message}`, { groupUserId });
    }
  }

  private async verifyGroupUserActivation(groupUserId: string): Promise<void> {
    const { data: verifyUser, error: verifyError } = await this.supabase
      .from('group_users')
      .select('is_active')
      .eq('id', groupUserId)
      .single();

    if (verifyError || !verifyUser || !verifyUser.is_active) {
      throw new ProcessingError('Failed to verify group user activation', { groupUserId });
    }
  }

  private async verifyApplicationStatus(): Promise<void> {
    const { data: verifyApp, error: verifyAppError } = await this.supabase
      .from('applications')
      .select('status')
      .eq('id', this.metadata.application_id)
      .single();

    if (verifyAppError || !verifyApp || verifyApp.status !== 'approved') {
      throw new ProcessingError('Failed to verify application status', {
        applicationId: this.metadata.application_id
      });
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
