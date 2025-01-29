export interface CartItem {
  productId: string;
  type: 'membership';
  metadata?: {
    groupId: string;
    groupUserId?: string;
    applicationId?: string;
  };
}

export interface Cart {
  items: CartItem[];
  createdAt: string;
  expiresAt: string;
}

export const CART_SESSION_KEY = 'membership_cart'; 