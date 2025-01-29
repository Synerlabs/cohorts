export type SuborderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ISuborder {
  id: string;
  order_id: string;
  status: SuborderStatus;
  product_id: string;
  product?: {
    id: string;
    type: string;
    [key: string]: any;
  };
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  failed_at?: string;
  cancelled_at?: string;
}

// Type guard to check if a suborder is for a membership product
export function isMembershipSuborder(suborder: ISuborder, product: { type: string }): suborder is IMembershipSuborder {
  return product.type === 'membership';
}

export interface IMembershipSuborder extends ISuborder {
  metadata: {
    application_id?: string;
    group_user_id?: string;
    start_date?: string;
    end_date?: string;
  };
} 
