export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentType = 'manual' | 'stripe';

export interface Upload {
  id: string;
  module: string;
  originalFilename: string;
  storagePath: string;
  storageProvider: string;
  fileUrl: string;
  fileId?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  uploads: Upload[];
  order?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    product: {
      id: string;
      name: string;
      description?: string;
      price: number;
      currency: string;
      type: string;
    };
  };
}

export interface ManualPayment extends BasePayment {
  type: 'manual';
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
  proofFiles?: Array<{
    name: string;
    type: string;
    base64: string;
  }>;
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

export interface GetPaymentsOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface GetPaymentsResult {
  data: Payment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaymentActionPayload {
  paymentId: string;
  orgId: string;
  notes?: string;
} 