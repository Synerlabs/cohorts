export enum MembershipActivationType {
  AUTOMATIC = 'automatic',
  REVIEW_REQUIRED = 'review_required',
  PAYMENT_REQUIRED = 'payment_required',
  REVIEW_THEN_PAYMENT = 'review_then_payment'
}

export type Membership = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
  is_active: boolean;
  created_at: string;
  group_id: string;
  created_by: string;
  activation_type: MembershipActivationType;
  member_count?: number;
}; 