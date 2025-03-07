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
  duration_unit?: 'month' | 'year';
  activation_type: MembershipActivationType;
  member_id_format?: string;
  form_template_id?: string | null;
  type: 'membership' | 'organization';
  form_template?: any | null;
  
  // Enhanced duration fields
  has_fixed_dates?: boolean;
  fixed_start_date?: string | null;
  fixed_end_date?: string | null;
  
  is_fiscal_period?: boolean;
  fiscal_start_month?: number | null;
  fiscal_start_day?: number | null;
  
  has_monthly_cycle?: boolean;
  monthly_start_day?: number | null;
  monthly_end_day_type?: 'specific' | 'last_day';
  monthly_end_day?: number | null;
  
  roles?: {
    id: string;
    role_name: string;
    permissions: string[];
  }[];
}

export interface IMembershipTierProduct extends IProduct {
  type: 'membership_tier';
  membership_tier: MembershipTierRow;
  form_template_id: string;
} 