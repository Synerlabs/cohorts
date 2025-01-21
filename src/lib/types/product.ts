import { Currency } from './membership';
import { Database } from './database.types';

export type ProductType = 'membership_tier' | 'subscription' | 'one_time';

export interface IProduct {
  id: string;
  type: ProductType;
  name: string;
  description: string | null;
  price: number; // in cents
  currency: Currency;
  group_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type MembershipTierRow = Database['public']['Tables']['membership_tiers']['Row'];

export interface IMembershipTierProduct extends IProduct {
  type: 'membership_tier';
  membership_tier: MembershipTierRow;
} 