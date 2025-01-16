"use server";

import { revalidatePath } from "next/cache";
import { approveApplication, rejectApplication } from "@/services/applications.service";

export async function approveApplicationAction(
  prevState: { success?: boolean } | undefined,
  formData: FormData,
) {
  try {
    const applicationId = formData.get('id') as string;
    if (!applicationId) {
      return {
        error: "Application ID is required",
        success: false,
      };
    }

    const application = await approveApplication(applicationId);

    revalidatePath('/(authenticated)/[orgSlug]/(org-pages)/applications');
    return {
      success: true,
    };
  } catch (error: any) {
    console.error(error);
    return {
      error: error.message || "An error occurred while approving the application",
      success: false,
    };
  }
}

export async function rejectApplicationAction(
  prevState: { success?: boolean } | undefined,
  formData: FormData,
) {
  try {
    const applicationId = formData.get('id') as string;
    if (!applicationId) {
      return {
        error: "Application ID is required",
        success: false,
      };
    }

    await rejectApplication(applicationId);

    revalidatePath('/(authenticated)/[orgSlug]/(org-pages)/applications');
    return {
      success: true,
    };
  } catch (error: any) {
    console.error(error);
    return {
      error: error.message || "An error occurred while rejecting the application",
      success: false,
    };
  }
} 