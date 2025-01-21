export type ApplicationType = 'membership';
export type ApplicationStatus = 'pending' | 'pending_payment' | 'payment_failed' | 'approved' | 'rejected';

export interface IApplication {
  id: string;
  type: ApplicationType;
  status: ApplicationStatus;
  group_user_id: string;
  tier_id: string; // product_id
  order_id: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IMembershipApplication {
  application_id: string;
  application_status: ApplicationStatus;
  group_user_id: string;
  product_id: string;
  order_id: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  submitted_at: string;
  updated_at: string;
  type: ApplicationType;
  group_id: string;
  user_data?: {
    id: string;
    email: string;
    full_name: string;
  };
  product_data?: {
    name: string;
    price: number;
    currency: string;
    duration_months: number;
    activation_type: string;
  };
  order_data?: {
    status: string;
    amount: number;
    currency: string;
    completed_at: string | null;
  };
} 