"use server";
import { SuborderService } from "@/services/suborder.service";
import { checkUserAccess } from "@/lib/utils/permissions";
import { permissions } from "@/lib/types/permissions";

export async function processSubordersAction(formData: FormData) {
  const orderId = formData.get("orderId") as string;
  const groupId = formData.get("groupId") as string;
  const userId = formData.get("userId") as string;

  // Check admin permission
  const { hasAccess } = await checkUserAccess({
    userId,
    groupId,
    requiredPermissions: ["group.orders.edit"],
  });
  if (!hasAccess) throw new Error("Not authorized");

  await SuborderService.processOrderSuborders(orderId);
} 