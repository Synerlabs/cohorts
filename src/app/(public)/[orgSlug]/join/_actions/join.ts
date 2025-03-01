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

    // Create group user if not exists
    let groupUser = await getGroupUser({userId, groupId});

    if (!groupUser) {
      groupUser = await createGroupUser(groupId, userId);
      if (!groupUser) {
        return {
          errors: {
            form: ['Failed to create group user']
          }
        };
      }
    } 

    // Ensure we have a valid group_user_id before proceeding
    if (!groupUser.id) {
      console.error('Missing group_user_id for user', userId, 'in group', groupId);
      return {
        errors: {
          form: ['Failed to retrieve group user information']
        }
      };
    }

    // Create application with form data if provided
    const application = await createMembershipApplication(
      groupUser.id, 
      membershipTierId,
      formSubmissionData ? JSON.parse(formSubmissionData) : undefined
    );

    // For paid memberships that require payment, add to cart
    if (membershipTier.price > 0 && (
      membershipTier.membership_tier.activation_type as MembershipActivationType === MembershipActivationType.PAYMENT_REQUIRED ||
      membershipTier.membership_tier.activation_type as MembershipActivationType === MembershipActivationType.FORM_THEN_PAYMENT ||
      membershipTier.membership_tier.activation_type as MembershipActivationType === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW
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

    // For form_then_payment, redirect to application status after form submission
    if (membershipTier.membership_tier.activation_type as MembershipActivationType === MembershipActivationType.FORM_THEN_PAYMENT ||
        membershipTier.membership_tier.activation_type as MembershipActivationType === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT) {
      return {
        message: 'Your membership application has been submitted.',
        redirect: `/@${org.slug}/applications/${application.id}`
      };
    }

    // For free memberships or those not requiring immediate payment, process immediately
    if (membershipTier.price === 0 || (
      membershipTier.membership_tier.activation_type as MembershipActivationType !== MembershipActivationType.PAYMENT_REQUIRED &&
      membershipTier.membership_tier.activation_type as MembershipActivationType !== MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW &&
      membershipTier.membership_tier.activation_type as MembershipActivationType !== MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
    )) {
      // For automatic activation or form_required, redirect to membership page instead of application page
      if (membershipTier.membership_tier.activation_type as MembershipActivationType === MembershipActivationType.AUTOMATIC ||
          membershipTier.membership_tier.activation_type as MembershipActivationType === MembershipActivationType.FORM_REQUIRED) {
        return {
          message: 'Your membership has been activated.',
          redirect: `/@${org.slug}/membership`
        };
      }
      
      return {
        message: 'Your membership application has been submitted.',
        redirect: `/@${org.slug}/applications/${application.id}`
      };
    }

    // For paid memberships, redirect to checkout
    return {
      message: 'Please complete your payment to submit your application.',
      redirect: `/@${org.slug}/checkout`
    };

  } catch (error: any) {
    console.error('Failed to join:', error);
    return {
      errors: {
        form: ['Failed to process your membership application. Please try again.']
      }
    };
  }
} 