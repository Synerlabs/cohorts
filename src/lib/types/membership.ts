export enum MembershipActivationType {
  AUTOMATIC = 'automatic',
  REVIEW_REQUIRED = 'review_required',
  PAYMENT_REQUIRED = 'payment_required',
  REVIEW_THEN_PAYMENT = 'review_then_payment'
}

export type MembershipTier = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
  activation_type: MembershipActivationType;
  created_at: string;
  group_id: string;
  member_count?: number;
};

export type MembershipTierRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
  activation_type: MembershipActivationType;
  created_at: string;
  group_id: string;
};

export type Membership = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
  group_id: string;
  group_user_id: string;
  tier_id: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  activation_type: MembershipActivationType;
  member_count?: number;
  tier?: MembershipTier;
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