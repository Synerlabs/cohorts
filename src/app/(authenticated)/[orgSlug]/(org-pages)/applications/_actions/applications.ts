'use server';

import { revalidatePath } from "next/cache";
import { approveApplication, rejectApplication } from "@/services/applications.service";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserRoles } from "@/services/user.service";
import { getCachedCurrentUser, getCachedOrgBySlug } from "@/lib/utils/cache";
import { MembershipActivationType } from "@/lib/types/membership";
import { withPermissions } from "@/lib/utils/action-permissions";
import { permissions } from "@/lib/types/permissions";
import { MembershipActivationService } from "@/services/membership-activation.service";

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
  formData: FormData
): Promise<ActionResponse> {
  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }, params: { formData: FormData }) => {
      try {
        const applicationId = params.formData.get('id') as string;
        if (!applicationId) {
          return {
            error: "Application ID is required",
            success: false
          };
        }

        console.log(`Starting approval process for application: ${applicationId}`);
        
        // Get the application details before approval
        const supabase = await createClient();
        const { data: beforeApp } = await supabase
          .from('applications_view')
          .select('status, activation_type, order_id')
          .eq('id', applicationId)
          .single();
          
        console.log(`Application before approval: Status=${beforeApp?.status}, Type=${beforeApp?.activation_type}, OrderID=${beforeApp?.order_id || 'None'}`);
        
        // Approve the application - this will handle membership creation internally
        await approveApplication(applicationId);
        
        // Verify the application was approved
        const { data: afterApp } = await supabase
          .from('applications_view')
          .select('status, approved_at, activation_type')
          .eq('id', applicationId)
          .single();
          
        console.log(`Application after approval: Status=${afterApp?.status}, Approved=${afterApp?.approved_at ? 'Yes' : 'No'}, Type=${afterApp?.activation_type}`);
        
        // Verify that membership was created and group user is active
        try {
          // Check if membership was created
          const membershipCreated = await MembershipActivationService.verifyMembershipCreated(applicationId);
          console.log(`Membership created for application ${applicationId}: ${membershipCreated ? 'Yes' : 'No'}`);
          
          // Get the group_user_id from the application
          const { data: appData } = await supabase
            .from('applications')
            .select('group_user_id')
            .eq('id', applicationId)
            .single();
            
          if (appData) {
            // Check if group user is active
            const isActive = await MembershipActivationService.verifyGroupUserActive(appData.group_user_id);
            console.log(`Group user active for application ${applicationId}: ${isActive ? 'Yes' : 'No'}`);
            
            // If the group user is not active, activate it
            if (!isActive) {
              console.log(`Activating group user for application ${applicationId}`);
              await MembershipActivationService.activateGroupUser(appData.group_user_id);
            }
          }
        } catch (verifyError) {
          console.error(`Error verifying membership/activation for application ${applicationId}:`, verifyError);
          // Don't throw, just log the error
        }
        
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
    },
    (params: { formData: FormData }) => {

      return {
        moduleId: formData.get('id') as string,
        moduleType: 'applications',
        requiredPermissions: [
          permissions.applications.process
        ]
      };
    }
  );

  return handler(prevState, { formData });
}

export async function handleRejectApplication(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }, params: { formData: FormData }) => {
      try {
        const applicationId = params.formData.get('id') as string;
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
    },
    (params: { formData: FormData }) => {
      return {
        moduleId: formData.get('id') as string,
        moduleType: 'applications',
        requiredPermissions: [
          permissions.applications.process
        ]
      };
    }
  );

  return handler(prevState, { formData });
} 