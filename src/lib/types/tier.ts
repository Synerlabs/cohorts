import { Currency, MembershipActivationType } from './membership';

/**
 * Base tier type that both membership tiers and organization tiers will inherit from
 */
export interface BaseTier {
  id: string;
  name: string;
  description: string | null;
  price: number; // stored in cents
  currency: Currency;
  duration_months: number;
  activation_type: MembershipActivationType;
  created_at: string;
  form_template_id?: string | null;
}

/**
 * Base application type for all tier-based applications
 */
export interface BaseApplication {
  id: string;
  tier_id: string;
  status: 'pending' | 'pending_payment' | 'approved' | 'rejected';
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  form_submission_id?: string | null;
}

/**
 * Base affiliation type for all tier-based affiliations
 */
export interface BaseAffiliation {
  id: string;
  tier_id: string; 
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  created_at: string;
}

/**
 * Interface for service classes handling tiers
 */
export interface TierService<T extends BaseTier, A extends BaseApplication, F extends BaseAffiliation> {
  getTiers(params: any): Promise<T[]>;
  createTier(data: any): Promise<T>;
  createApplication(data: any): Promise<A>;
  processApplication(applicationId: string, action: 'approve' | 'reject'): Promise<A>;
  createAffiliation(data: any): Promise<F>;
} 