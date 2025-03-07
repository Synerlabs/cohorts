/**
 * Represents a membership tier in the system
 */
export interface MembershipTier {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval?: string;  // month, year, lifetime, etc.
  benefits?: string | string[];
  membership_tier_settings?: any[];
}

/**
 * Represents settings for a membership tier
 */
export interface MembershipTierSettings {
  id: string;
  membership_tier_id: string;
  key: string;
  value: string | number | boolean | null;
}

/**
 * Represents a user's membership to an organization
 */
export interface Membership {
  id: string;
  user_id: string;
  group_id: string; 
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  tier_id?: string;
  tier?: MembershipTier;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
} 