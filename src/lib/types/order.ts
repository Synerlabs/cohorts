import { Currency } from './membership';

export type OrderType = 'membership' | 'subscription' | 'one_time';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paid';

export interface IOrder {
  id: string;
  type: OrderType;
  user_id: string;
  product_id: string;
  status: OrderStatus;
  amount: number; // in cents
  currency: Currency;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface IMembershipOrder extends IOrder {
  type: 'membership';
  membership: {
    group_user_id: string;
    start_date: string | null;
    end_date: string | null;
  };
} 