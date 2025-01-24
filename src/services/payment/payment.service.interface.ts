import { CreatePaymentDTO, Payment, PaymentStatus, UpdatePaymentDTO } from './types';

export interface PaymentService {
  createPayment(data: CreatePaymentDTO): Promise<Payment>;
  getPayment(id: string): Promise<Payment>;
  getPaymentsByOrderId(orderId: string): Promise<Payment[]>;
  getPaymentsByOrgId(orgId: string): Promise<Payment[]>;
  updatePayment(id: string, data: UpdatePaymentDTO): Promise<Payment>;
  approvePayment(id: string, notes?: string): Promise<Payment>;
  rejectPayment(id: string, notes: string): Promise<Payment>;
} 