'use server';

import { revalidatePath } from "next/cache";
import { getPendingApplications as getApplications, approveApplication, rejectApplication } from "@/services/applications.service";

export async function getPendingApplications(groupId: string) {
  return getApplications(groupId);
}

type State = {
  success: boolean;
  error?: string;
  message?: string;
};

export async function approveApplicationAction(
  prevState: State | null,
  formData: FormData
): Promise<State> {
  try {
    const applicationId = formData.get('applicationId') as string;
    const orgSlug = formData.get('orgSlug') as string;

    if (!applicationId || !orgSlug) {
      return {
        success: false,
        error: 'Missing required fields'
      };
    }

    await approveApplication(applicationId);
    revalidatePath(`/@${orgSlug}/applications`);

    return {
      success: true,
      message: 'Application approved successfully'
    };
  } catch (error: any) {
    console.error('Approve error:', error);
    return {
      success: false,
      error: error.message || 'Failed to approve application'
    };
  }
}

export async function rejectApplicationAction(
  prevState: State | null,
  formData: FormData
): Promise<State> {
  try {
    const applicationId = formData.get('applicationId') as string;
    const orgSlug = formData.get('orgSlug') as string;

    if (!applicationId || !orgSlug) {
      return {
        success: false,
        error: 'Missing required fields'
      };
    }

    await rejectApplication(applicationId);
    revalidatePath(`/@${orgSlug}/applications`);

    return {
      success: true,
      message: 'Application rejected successfully'
    };
  } catch (error: any) {
    console.error('Reject error:', error);
    return {
      success: false,
      error: error.message || 'Failed to reject application'
    };
  }
} 