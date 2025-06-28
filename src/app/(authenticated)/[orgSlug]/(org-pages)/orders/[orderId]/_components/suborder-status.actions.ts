"use server";
import { SuborderService } from '@/services/suborder.service';
import { SuborderStatus } from '@/lib/types/suborder';

export async function updateSuborderStatusAction(formData: FormData) {
  const suborderId = formData.get("suborderId") as string;
  const status = formData.get("status") as SuborderStatus;
  await SuborderService.updateSuborderStatus(suborderId, status);
} 