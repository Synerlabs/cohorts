import { Currency } from './membership';
import { Database } from './database.types';
import { MembershipActivationType } from "./membership";

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

export interface MembershipTierRow {
  product_id: string;
  duration_months: number;
  activation_type: MembershipActivationType;
  member_id_format?: string;
  form_template_id?: string | null;
}

export interface IMembershipTierProduct extends IProduct {
  type: 'membership_tier';
  membership_tier: MembershipTierRow;
  form_template_id: string;
} 