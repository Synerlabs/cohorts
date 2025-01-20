'use server';

import { createClient } from "@/lib/utils/supabase/server";
import { ProductService } from "@/services/product.service";
import { ApplicationService } from "@/services/application.service";
import { revalidatePath } from "next/cache";

type State = {
  message?: string;
  error?: string;
  success: boolean;
};

export async function joinOrgWithMembership(
  prevState: State | null,
  formData: FormData
): Promise<State> {
  try {
    const groupId = formData.get('groupId') as string;
    const userId = formData.get('userId') as string;
    const productId = formData.get('membershipId') as string;

    if (!groupId || !userId || !productId) {
      return {
        success: false,
        error: 'Missing required fields'
      };
    }

    const supabase = await createClient();

    // First get the existing group_user record
    const { data: groupUser, error: groupUserError } = await supabase
      .from('group_users')
      .select('id')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .single();

    if (groupUserError && groupUserError.code !== 'PGRST116') {
      throw groupUserError;
    }

    // Get and validate membership tier product
    const product = await ProductService.getMembershipTier(productId);
    if (!product) {
      return {
        success: false,
        error: 'Membership tier not found'
      };
    }

    // Determine initial active state
    const isInitiallyActive = product.price === 0 && 
      product.membership_tier.activation_type === 'automatic';

    // Get org for revalidation
    const { data: org, error: orgError } = await supabase
      .from('group')
      .select('slug')
      .eq('id', groupId)
      .single();

    if (orgError) throw orgError;

    let groupUserId = groupUser?.id;

    // Only create group_user if it doesn't exist
    if (!groupUserId) {
      const { data: newGroupUser, error: createError } = await supabase
        .from('group_users')
        .insert({
          user_id: userId,
          group_id: groupId,
          is_active: isInitiallyActive
        })
        .select('id')
        .single();

      if (createError) throw createError;
      groupUserId = newGroupUser.id;
    }

    // Create application using the existing or new group_user_id
    const application = await ApplicationService.createMembershipApplication(
      groupUserId,
      productId
    );

    revalidatePath(`/@${org.slug}/join`);

    const statusMessages = {
      'automatic': 'You have been automatically approved. Welcome!',
      'review_required': 'Your application is pending review.',
      'payment_required': 'Please complete payment to join.',
      'review_then_payment': 'Your application is pending review. Once approved, you will be asked to complete payment.',
    };

    return {
      success: true,
      message: statusMessages[product.membership_tier.activation_type]
    };

  } catch (error: any) {
    console.error('Join error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process join request'
    };
  }
} 