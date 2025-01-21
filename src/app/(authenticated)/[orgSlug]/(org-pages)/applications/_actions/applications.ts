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

type ActionResponse = {
  success?: boolean;
  error?: string;
};

export async function handleApproveApplication(
  prevState: ActionResponse | null,
  data: { id: string }
): Promise<ActionResponse> {
  try {
    const applicationId = data.id;
    if (!applicationId) {
      return {
        error: "Application ID is required",
        success: false
      };
    }

    await approveApplication(applicationId);
    revalidatePath('/[orgSlug]/applications');

    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error approving application:', error);
    return {
      error: error.message || 'Failed to approve application',
      success: false
    };
  }
}

export async function handleRejectApplication(
  prevState: ActionResponse | null,
  data: { id: string }
): Promise<ActionResponse> {
  try {
    const applicationId = data.id;
    if (!applicationId) {
      return {
        error: "Application ID is required",
        success: false
      };
    }

    await rejectApplication(applicationId);
    revalidatePath('/[orgSlug]/applications');

    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error rejecting application:', error);
    return {
      error: error.message || 'Failed to reject application',
      success: false
    };
  }
} 