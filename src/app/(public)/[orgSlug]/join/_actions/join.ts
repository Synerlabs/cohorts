'use server';

import { revalidatePath } from "next/cache";
import { OrderService } from "@/services/order.service";
import { addItem } from "@/lib/utils/cart";
import { ProductService } from "@/services/product.service";
import { createGroupUser } from "@/services/join.service";
import { createMembershipApplication } from "@/services/applications.service";
import { createClient } from "@/lib/utils/supabase/server";
import { MembershipActivationType } from "@/lib/types/membership";
import { getGroupUser } from "@/services/user.service";
import { MembershipActivationService } from "@/services/membership-activation.service";

type State = {
  message?: string;
  errors?: {
    form?: string[];
  };
  redirect?: string;
};

export async function join(prevState: State, formData: FormData): Promise<State> {
  try {
    const groupId = formData.get('groupId') as string;
    const membershipTierId = formData.get('membershipTierId') as string;
    const userId = formData.get('userId') as string;
    const formSubmissionData = formData.get('formData') as string;
    // Organization-specific data for organization-type tiers
    const organizationId = formData.get('organizationId') as string;
    const organizationName = formData.get('organizationName') as string;

    if (!groupId || !membershipTierId || !userId) {
      return {
        errors: {
          form: ['Missing required fields']
        }
      };
    }

    // Get membership tier
    const membershipTier = await ProductService.getMembershipTier(membershipTierId);
    if (!membershipTier) {
      return {
        errors: {
          form: ['Invalid membership tier']
        }
      };
    }
    
    // Check if this is an organization-type tier
    const isOrganizationTier = membershipTier.membership_tier.type === 'organization';
    
    if (isOrganizationTier && (!organizationId && !organizationName)) {
      return {
        errors: {
          form: ['Missing organization information']
        }
      };
    }

    // Create group user if not exists
    let groupUser = await getGroupUser({userId, groupId});

    if (!groupUser) {
      groupUser = await createGroupUser({
        userId,
        groupId
      });
    }

    // Create application
    console.log('Creating application for membership tier:', {
      groupUserId: groupUser.id,
      tierId: membershipTierId,
      formData: formSubmissionData ? JSON.parse(formSubmissionData) : null,
      isOrganizationTier,
      organizationId: isOrganizationTier ? organizationId : null,
      organizationName: isOrganizationTier ? organizationName : null
    });

    // For organization tiers, check if there's already a relationship 
    // between the two groups in group_organization table
    if (isOrganizationTier && organizationId) {
      const supabase = await createClient();
      const { data: existingRelation, error: relError } = await supabase
        .from('group_organization')
        .select('id, is_active, tier_id')
        .eq('parent_group_id', groupId)
        .eq('child_group_id', organizationId)
        .maybeSingle();
        
      if (relError) {
        console.error('Error checking existing group_organization relationship:', relError);
        // Continue with creating the application
      } else if (existingRelation) {
        // If there's already an active relationship with this tier, inform the user
        if (existingRelation.is_active && existingRelation.tier_id === membershipTierId) {
          return {
            message: 'This organization is already affiliated with this membership tier.',
            redirect: `/${organizationName.toLowerCase().replace(/\s+/g, '-')}`
          };
        }
      }
      
      // Make sure the organization is active
      const { error: activateOrgError } = await supabase
        .from('group')
        .update({ is_active: true })
        .eq('id', organizationId);
        
      if (activateOrgError) {
        console.error('Error activating organization:', activateOrgError);
        // Continue with creating the application
      }
    }

    // Create the application with metadata for organization tiers
    const metadata = isOrganizationTier ? {
      organizationId,
      organizationName
    } : undefined;
    
    // Pass the form data and metadata to the application service
    const application = await createMembershipApplication(
      groupUser.id,
      membershipTierId,
      formSubmissionData ? JSON.parse(formSubmissionData) : undefined,
      metadata
    );

    // For automatic activation types, process the application immediately
    if (membershipTier.membership_tier.activation_type === MembershipActivationType.AUTOMATIC ||
        membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_REQUIRED) {
      try {
        console.log('Processing application with automatic activation:', application.id);
        await MembershipActivationService.processApplication(application.id);
      } catch (error) {
        console.error('Error processing application with automatic activation:', error);
        // Continue with the flow even if there's an error, as the application was created
      }
    }

    // For paid memberships that require payment, add to cart
    if (membershipTier.price > 0 && (
      membershipTier.membership_tier.activation_type === MembershipActivationType.PAYMENT_REQUIRED ||
      membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_PAYMENT ||
      membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW ||
      membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
    )) {
      await addItem({
        productId: membershipTierId,
        type: 'membership',
        metadata: {
          groupId,
          groupUserId: groupUser.id,
          applicationId: application.id
        }
      });
    }

    const supabase = await createClient();

    // Get org for redirect
    const { data: org, error: orgError } = await supabase
      .from('group')
      .select('slug')
      .eq('id', groupId)
      .single();

    if (orgError) throw orgError;

    // For tiers that require payment, redirect to checkout
    if (membershipTier.price > 0 && (
      membershipTier.membership_tier.activation_type === MembershipActivationType.PAYMENT_REQUIRED ||
      membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_PAYMENT ||
      membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW ||
      membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
    )) {
      return {
        message: 'Redirecting to payment...',
        redirect: `/${org.slug}/join/payment`
      };
    }

    // For tiers that don't require payment, redirect to thank you page
    revalidatePath(`/${org.slug}/join`);
    return {
      message: 'Your membership application was submitted successfully!',
      redirect: `/${org.slug}/join?status=success&app=${application.id}`
    };
  } catch (error) {
    console.error('Error during join flow:', error);
    return {
      errors: {
        form: [(error as Error).message || 'An error occurred during the join process']
      }
    };
  }
} 