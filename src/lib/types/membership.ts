export enum MembershipActivationType {
  AUTOMATIC = 'automatic',
  REVIEW_REQUIRED = 'review_required',
  PAYMENT_REQUIRED = 'payment_required',
  REVIEW_THEN_PAYMENT = 'review_then_payment'
}

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

export type MembershipTier = {
  id: string;
  name: string;
  description: string | null;
  price: number; // stored in cents
  currency: Currency;
  duration_months: number;
  activation_type: MembershipActivationType;
  member_id_format: string;
  created_at: string;
  group_id: string;
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