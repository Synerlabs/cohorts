"use server";
import { SuborderService } from "@/services/suborder.service";
import { checkUserAccess } from "@/lib/utils/permissions";

export async function processSingleSuborderAction(formData: FormData) {
  const suborderId = formData.get("suborderId") as string;
  const groupId = formData.get("groupId") as string;
  const userId = formData.get("userId") as string;

  // Check admin permission
  const { hasAccess } = await checkUserAccess({
    userId,
    groupId,
    requiredPermissions: ["group.orders.edit"],
  });
  if (!hasAccess) throw new Error("Not authorized");

  await SuborderService.processSuborderById(suborderId);
} 