'use server';

import { revalidatePath } from "next/cache";
import { approveApplication, rejectApplication } from "@/services/applications.service";
import { createClient } from "@/lib/utils/supabase/server";

type MembershipWithGroup = {
  group: {
    slug: string;
  };
};

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

    // Get org slug for revalidation
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from('user_membership')
      .select('group:group_id(slug)')
      .eq('id', applicationId)
      .single() as { data: MembershipWithGroup | null };

    if (membership?.group?.slug) {
      // Revalidate both the specific page and the layout
      revalidatePath(`/@${membership.group.slug}/applications`);
      revalidatePath('/', 'layout');
    }

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

    // Get org slug for revalidation before deleting
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from('user_membership')
      .select('group:group_id(slug)')
      .eq('id', applicationId)
      .single() as { data: MembershipWithGroup | null };

    await rejectApplication(applicationId);

    if (membership?.group?.slug) {
      // Revalidate both the specific page and the layout
      revalidatePath(`/@${membership.group.slug}/applications`);
      revalidatePath('/', 'layout');
    }

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