"use server";
import { OrderService } from '@/services/order.service';
import { OrderStatus } from '@/lib/types/order';

export async function updateOrderStatusAction(formData: FormData) {
  const orderId = formData.get("orderId") as string;
  const status = formData.get("status") as OrderStatus;
  await OrderService.updateOrderStatus(orderId, status);
} 