export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentType = 'manual' | 'stripe';

export interface BasePayment {
  id: string;
  orderId: string;
  userId: string;
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ManualPayment extends BasePayment {
  type: 'manual';
  proofFileId?: string;
  proofUrl?: string;
  notes?: string;
}

export interface StripePayment extends BasePayment {
  type: 'stripe';
  stripePaymentIntentId: string;
  stripePaymentMethod?: string;
  stripeStatus: string;
}

export type Payment = ManualPayment | StripePayment;

export interface CreatePaymentDTO {
  orderId: string;
  orgId: string;
  userId: string;
  type: PaymentType;
  amount: number;
  currency: string;
}

export interface CreateManualPaymentDTO extends CreatePaymentDTO {
  type: 'manual';
  proofFile?: {
    name: string;
    type: string;
    base64: string;
  };
  notes?: string;
}

export interface CreateStripePaymentDTO extends CreatePaymentDTO {
  type: 'stripe';
  paymentMethodId: string;
}

export interface UpdatePaymentDTO {
  status?: PaymentStatus;
  notes?: string;
}

export interface PaymentActionPayload {
  paymentId: string;
  orgId: string;
  notes?: string;
} 