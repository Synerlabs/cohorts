"use server";

import { createOrgMember } from "@/services/org.service";

type CurrentState = {
  userId?: string;
  groupId?: string;
  success: boolean;
  error?: string;
} | null;

export const joinGroupAction = async (
  currentState: CurrentState,
  formData: FormData,
) => {
  try {
    const groupId = formData.get("groupId") as string;
    const userId = formData.get("userId") as string;

    if (!groupId || !userId) {
      return {
        success: false,
        error: "Missing required fields",
      };
    }

    const { id } = await createOrgMember({
      groupId,
      userId,
    });

    return {
      success: true,
      message: "Joined group successfully",
      groupId,
      userId,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Failed to join group",
    };
  }
};
