'use server';

import { revalidatePath } from "next/cache";
import { OrderService } from "@/services/order.service";
import { addItem } from "@/lib/utils/cart";
import { ProductService } from "@/services/product.service";
import { createGroupUser } from "@/services/join.service";
import { createMembershipApplication } from "@/services/applications.service";
import { createClient } from "@/lib/utils/supabase/server";

type State = {
  message?: string;
  errors?: {
    [key: string]: string[];
  };
  redirect?: string;
};

export async function join(prevState: State, formData: FormData): Promise<State> {
  try {
    const groupId = formData.get('groupId') as string;
    const membershipTierId = formData.get('membershipTierId') as string;
    const userId = formData.get('userId') as string;

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
    const groupUser = await createGroupUser(groupId, userId);
    if (!groupUser) {
      return {
        errors: {
          form: ['Failed to create group user']
        }
      };
    }

    // Create application
    const application = await createMembershipApplication(groupUser.id, membershipTierId);

    // Add to cart
    await addItem({
      productId: membershipTierId,
      type: 'membership',
      metadata: {
        groupId,
        groupUserId: groupUser.id,
        applicationId: application.id
      }
    });

    const supabase = await createClient();

    // Get org for redirect
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('slug')
      .eq('id', groupId)
      .single();

    if (orgError) throw orgError;

    const groupSlug = org.slug;

    // For free memberships, process immediately
    if (membershipTier.price === 0) {
      const order = await OrderService.createOrderFromCart(userId);
      return {
        message: 'Your membership application has been submitted.',
        redirect: `/orgs/${groupSlug}/applications/${application.id}`
      };
    }

    // For paid memberships, redirect to checkout
    return {
      message: 'Please complete your payment to submit your application.',
      redirect: `/orgs/${groupSlug}/checkout`
    };

  } catch (error) {
    console.error('Failed to join:', error);
    return {
      errors: {
        form: ['Failed to process your membership application. Please try again.']
      }
    };
  }
} 