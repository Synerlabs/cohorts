import { BaseTier, BaseApplication, BaseAffiliation } from './tier';

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

// Used for membership status throughout the application
export enum MembershipStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended'
}

// For backwards compatibility with existing code
export type MembershipStatusType = 'active' | 'expired' | 'cancelled' | 'suspended';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

export type MembershipTier = BaseTier & {
  group_id: string;
  member_id_format: string;
  member_count?: number;
};

export type MembershipTierRow = {
  id: string;
  name: string;
  description: string | null;
  price: number; // stored in cents
  currency: Currency;
  duration_months: number;
  activation_type: MembershipActivationType;
  created_at: string;
  group_id: string;
  form_template_id?: string | null;
};

export type MembershipApplication = BaseApplication & {
  group_user_id: string;
  tier?: MembershipTier;
  user_data?: {
    id: string;
    email: string;
    full_name: string;
  };
  tier_data?: {
    id: string;
    name: string;
    price: number;
    activation_type: string;
    duration_months: number;
  };
};

export type Membership = BaseAffiliation & {
  group_user_id: string;
  order_id: string;
  metadata?: any;
};

export interface IMembership {
  id: string;
  start_date: string | null;
  end_date: string | null;
  order_id: string;
  status: MembershipStatus;
  group_user: {
    id: string;
    user_id: string;
    user: {
      email: string;
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    };
  };
  tier: MembershipTier;
  created_at: string;
} 