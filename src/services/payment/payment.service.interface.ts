import { CreatePaymentDTO, Payment, PaymentStatus, UpdatePaymentDTO } from './types';

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

export interface PaymentService {
  createPayment(data: CreatePaymentDTO): Promise<Payment>;
  getPayment(id: string): Promise<Payment>;
  getPaymentsByOrderId(orderId: string): Promise<Payment[]>;
  getPaymentsByOrgId(orgId: string, options?: GetPaymentsOptions): Promise<GetPaymentsResult>;
  updatePayment(id: string, data: UpdatePaymentDTO): Promise<Payment>;
  approvePayment(id: string, notes?: string): Promise<Payment>;
  rejectPayment(id: string, notes: string): Promise<Payment>;
} 