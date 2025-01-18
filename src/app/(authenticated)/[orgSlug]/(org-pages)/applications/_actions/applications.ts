'use server';

import { revalidatePath } from "next/cache";
import { approveApplication, rejectApplication } from "@/services/applications.service";
import { createClient } from "@/lib/utils/supabase/server";
import { permissions } from "@/lib/types/permissions";
import { getUserRoles } from "@/services/user.service";
import { getCachedCurrentUser, getCachedOrgBySlug } from "@/lib/utils/cache";
import { MembershipActivationType } from "@/lib/types/membership";

type MembershipWithGroup = {
  group: {
    slug: string;
  };
};

type ApplicationWithMembership = {
  approved_at: string | null;
  membership_data: {
    activation_type: string;
  };
};

async function checkUserPermissions(requiredPermissions: string[], orgSlug: string): Promise<boolean> {
  try {
    // Get current user
    const { data: userData, error: userError } = await getCachedCurrentUser();
    if (userError || !userData?.user) {
      return false;
    }

    // Get org
    const { data: org, error: orgError } = await getCachedOrgBySlug(orgSlug);
    if (orgError || !org) {
      return false;
    }

    // Get user roles and their permissions
    const userRoles = await getUserRoles({ id: userData.user.id, groupId: org.id });
    const userPermissions = userRoles?.reduce((acc: string[], role) => {
      if (role.group_roles?.permissions) {
        return [...acc, ...role.group_roles.permissions];
      }
      return acc;
    }, []) || [];

    return userPermissions.some((permission) => requiredPermissions.includes(permission));
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}

async function isApplicationPendingPayment(applicationId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: application, error } = await supabase
      .from('applications_view')
      .select('approved_at, membership_data->activation_type')
      .eq('id', applicationId)
      .single() as { data: ApplicationWithMembership | null, error: any };

    if (error || !application) {
      return false;
    }

    // Application is pending payment if:
    // 1. It's already approved AND
    // 2. The membership requires payment (either payment_required or review_then_payment)
    return !!application.approved_at && 
      (application.membership_data.activation_type === MembershipActivationType.PAYMENT_REQUIRED ||
       application.membership_data.activation_type === MembershipActivationType.REVIEW_THEN_PAYMENT);
  } catch (error) {
    console.error('Error checking application payment status:', error);
    return false;
  }
}

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

    // Check if application is pending payment
    const isPendingPayment = await isApplicationPendingPayment(applicationId);
    if (isPendingPayment) {
      return {
        error: "Cannot approve an application that is pending payment",
        success: false,
      };
    }

    // Get org slug for permission check
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from('user_membership')
      .select('group:group_id(slug)')
      .eq('id', applicationId)
      .single() as { data: MembershipWithGroup | null };

    if (!membership?.group?.slug) {
      return {
        error: "Could not find organization",
        success: false,
      };
    }

    // Check permissions
    const hasPermission = await checkUserPermissions([permissions.applications.approve], membership.group.slug);
    if (!hasPermission) {
      return {
        error: "You don't have permission to approve applications",
        success: false,
      };
    }

    await approveApplication(applicationId);

    // Revalidate both the specific page and the layout
    revalidatePath(`/@${membership.group.slug}/applications`);
    revalidatePath('/', 'layout');

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

    // Check if application is pending payment
    const isPendingPayment = await isApplicationPendingPayment(applicationId);
    if (isPendingPayment) {
      return {
        error: "Cannot reject an application that is pending payment",
        success: false,
      };
    }

    // Get org slug for permission check and revalidation
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from('user_membership')
      .select('group:group_id(slug)')
      .eq('id', applicationId)
      .single() as { data: MembershipWithGroup | null };

    if (!membership?.group?.slug) {
      return {
        error: "Could not find organization",
        success: false,
      };
    }

    // Check permissions
    const hasPermission = await checkUserPermissions([permissions.applications.reject], membership.group.slug);
    if (!hasPermission) {
      return {
        error: "You don't have permission to reject applications",
        success: false,
      };
    }

    await rejectApplication(applicationId);

    // Revalidate both the specific page and the layout
    revalidatePath(`/@${membership.group.slug}/applications`);
    revalidatePath('/', 'layout');

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