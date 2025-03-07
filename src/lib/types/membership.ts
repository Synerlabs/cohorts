export enum MembershipActivationType {
  AUTOMATIC = 'automatic',
  REVIEW_REQUIRED = 'review_required',
  PAYMENT_REQUIRED = 'payment_required',
  REVIEW_THEN_PAYMENT = 'review_then_payment',
  FORM_REQUIRED = 'form_required',
  FORM_THEN_PAYMENT = 'form_then_payment',
  FORM_THEN_REVIEW = 'form_then_review',
  FORM_THEN_PAYMENT_THEN_REVIEW = 'form_then_payment_then_review',
  FORM_THEN_REVIEW_THEN_PAYMENT = 'form_then_review_then_payment'
}

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

export type MembershipTier = {
  id: string;
  name: string;
  description: string | null;
  price: number; // stored in cents
  currency: Currency;
  duration_months: number;
  duration_unit: 'month' | 'year';
  activation_type: MembershipActivationType;
  member_id_format: string;
  created_at: string;
  group_id: string;
  member_count?: number;
  form_template_id?: string | null;
  type: 'membership' | 'organization';
  has_fixed_dates: boolean;
  fixed_start_date?: string | null;
  fixed_end_date?: string | null;
  is_fiscal_period: boolean;
  fiscal_start_month?: number | null;
  fiscal_start_day?: number | null;
};

export type MembershipTierRow = {
  id: string;
  name: string;
  description: string | null;
  price: number; // stored in cents
  currency: Currency;
  duration_months: number;
  duration_unit: 'month' | 'year';
  activation_type: MembershipActivationType;
  created_at: string;
  group_id: string;
  form_template_id?: string | null;
  type: 'membership' | 'organization';
  has_fixed_dates: boolean;
  fixed_start_date?: string | null;
  fixed_end_date?: string | null;
  is_fiscal_period: boolean;
  fiscal_start_month?: number | null;
  fiscal_start_day?: number | null;
  has_monthly_cycle?: boolean;
  monthly_start_day?: number | null;
  monthly_end_day_type?: 'specific' | 'last_day';
  monthly_end_day?: number | null;
};

export enum MembershipStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended'
}

export type Membership = {
  id: string;
  order_id: string;
  group_user_id: string;
  tier_id: string;
  status: MembershipStatus;
  start_date: string | null;
  end_date: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  group_user_id: string;
  tier_id: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
  tier?: MembershipTier;
  user_data?: {
    id: string;
    email: string;
    full_name: string;
  };
};

export interface IMembership {
  group_user_id: string;
  order_id: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  group_user: {
    id: string;
    user_id: string;
    group_id: string;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    };
  };
  order: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    suborders: {
      id: string;
      product: {
        id: string;
        name: string;
        type: string;
        membership_tiers: {
          duration_months: number;
          activation_type: string;
        }[];
      };
    }[];
  };
}

export interface IMembershipTierProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: Currency;
  type: string;
  membership_tier: {
    activation_type: string;
    duration_months: number;
    duration_unit?: 'month' | 'year';
    member_id_format?: string;
    form_template_id?: string | null;
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
  };
} 