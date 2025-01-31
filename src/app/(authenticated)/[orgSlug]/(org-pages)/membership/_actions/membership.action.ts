"use server";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/utils/supabase/server";
import { z } from "zod";
import snakecaseKeys from "snakecase-keys";
import { ProductService } from "@/services/product.service";
import { IMembershipTierProduct } from "@/lib/types/product";
import { MembershipService } from "@/services/membership.service";
import { MembershipStatus } from "@/lib/types/membership";

const membershipTierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  group_id: z.string(),
  activation_type: z.enum(['automatic', 'review_required', 'payment_required', 'review_then_payment']).default('automatic'),
  member_id_format: z.string().min(1, "Member ID format is required").default('MEM-{YYYY}-{SEQ:3}')
});

const membershipTierUpdateSchema = membershipTierSchema
  .extend({
    id: z.string(),
  })
  .omit({ group_id: true });

type PrevState = {
  message?: string;
  issues?: any[];
  fields?: any[];
} | null;

type GroupUserWithGroup = {
  group: {
    slug: string;
  };
};

export async function getMembershipTiersAction(groupId: string): Promise<IMembershipTierProduct[]> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      membership_tiers!inner (
        *,
        membership_tier_settings (
          member_id_format
        )
      )
    `)
    .eq('group_id', groupId)
    .eq('type', 'membership_tier')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(tier => ({
    ...tier,
    membership_tier: {
      ...tier.membership_tiers,
      member_id_format: tier.membership_tiers.membership_tier_settings?.member_id_format
    }
  })) as IMembershipTierProduct[];
}

export interface IMembership {
  group_user_id: string;
  order_id: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  group_user: {
    id: string;
    user_id: string;
    group_id: string;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    };
  };
  order: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    suborders: {
      id: string;
      product: {
        id: string;
        name: string;
        type: string;
        membership_tiers: {
          duration_months: number;
          activation_type: string;
        }[];
      };
    }[];
  };
}

export async function getMembershipsAction(groupId: string): Promise<IMembership[]> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('memberships')
    .select(`
      *,
      group_user:group_user_id(
        id,
        user_id,
        group_id,
        user:user_id(
          id,
          first_name,
          last_name,
          avatar_url
        )
      ),
      order:order_id(
        id,
        amount,
        currency,
        status,
        suborders(
          id,
          product:product_id(
            id,
            name,
            type,
            membership_tiers(
              duration_months,
              activation_type
            )
          )
        )
      )
    `)
    .eq('group_user.group_id', groupId)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data as IMembership[];
}

function validateActivationType(price: number, activationType: string) {
  if (price === 0) {
    // Free memberships can't require payment
    if (activationType === 'payment_required' || 
        activationType === 'review_then_payment') {
      return "Free memberships cannot require payment";
    }
  } else {
    // Paid memberships must require payment, review, or both
    if (activationType === 'automatic') {
      return "Paid memberships must require payment, review, or both";
    }
  }
  return null;
}

export async function createMembershipTierAction(
  prevState: PrevState,
  formData: FormData,
) {
  const rawFormData = Object.fromEntries(formData.entries());
  const formDataObj = {
    ...rawFormData,
    price: Number(formData.get("price")), // Price is already in cents from the form
    duration_months: Number(formData.get("duration_months")),
    activation_type: formData.get("activation_type") || 'automatic',
    currency: formData.get("currency") || "USD",
    member_id_format: formData.get("member_id_format") || 'MEM-{YYYY}-{SEQ:3}'
  };

  // Validate activation type based on price
  const validationError = validateActivationType(
    formDataObj.price, 
    formDataObj.activation_type as string
  );

  if (validationError) {
    return {
      error: validationError,
      success: false,
    };
  }

  const parsedFormData = membershipTierSchema.safeParse(formDataObj);

  if (!parsedFormData.success) {
    return {
      error: parsedFormData.error.errors[0].message,
      success: false,
    };
  }

  const supabase = await createClient();

  const { data: org, error: orgError } = await supabase
    .from("group")
    .select("slug")
    .eq("id", parsedFormData.data.group_id)
    .single();

  if (orgError) {
    return {
      error: orgError.message,
      success: false,
    };
  }

  try {
    const product = await ProductService.createMembershipTier(
      parsedFormData.data.group_id,
      {
        name: parsedFormData.data.name,
        description: parsedFormData.data.description || null,
        price: parsedFormData.data.price,
        currency: parsedFormData.data.currency,
        duration_months: parsedFormData.data.duration_months,
        activation_type: parsedFormData.data.activation_type,
        member_id_format: parsedFormData.data.member_id_format
      }
    );

    revalidatePath(`/@${org.slug}/membership`);
    return {
      success: true,
      data: product,
    };
  } catch (error: any) {
    return {
      error: error.message || "Failed to create membership tier",
      success: false,
    };
  }
}

export async function updateMembershipTierAction(
  prevState: PrevState,
  formData: FormData,
) {
  const rawFormData = Object.fromEntries(formData.entries());
  const formDataObj = {
    ...rawFormData,
    price: Number(rawFormData.price), // Price is already in cents from the form
    duration_months: Number(rawFormData.duration_months),
    activation_type: rawFormData.activation_type || 'automatic',
    currency: rawFormData.currency || "USD",
    member_id_format: rawFormData.member_id_format || 'MEM-{YYYY}-{SEQ:3}'
  };

  // Validate activation type based on price
  const validationError = validateActivationType(
    formDataObj.price, 
    formDataObj.activation_type as string
  );

  if (validationError) {
    return {
      error: validationError,
      success: false,
    };
  }

  const parsedFormData = membershipTierUpdateSchema.safeParse(formDataObj);

  if (!parsedFormData.success) {
    return {
      error: parsedFormData.error.errors[0].message,
      success: false,
    };
  }

  const supabase = await createClient();

  try {
    const { data: tier } = await supabase
      .from("products")
      .select("group_id")
      .eq("id", parsedFormData.data.id)
      .single();

    if (!tier) throw new Error("Membership tier not found");

    const { data: org, error: orgError } = await supabase
      .from("group")
      .select("slug")
      .eq("id", tier.group_id)
      .single();

    if (orgError) throw orgError;

    const product = await ProductService.updateMembershipTier(
      parsedFormData.data.id,
      {
        name: parsedFormData.data.name,
        description: parsedFormData.data.description,
        price: parsedFormData.data.price,
        currency: parsedFormData.data.currency,
        duration_months: parsedFormData.data.duration_months,
        activation_type: parsedFormData.data.activation_type,
        member_id_format: parsedFormData.data.member_id_format
      }
    );

    revalidatePath(`/@${org.slug}/membership`);
    return {
      success: true,
      data: product,
    };

  } catch (error: any) {
    console.error(error);
    return {
      error: error.message || "An error occurred while updating the membership tier",
      success: false,
    };
  }
}

export async function deleteMembershipTierAction(
  prevState: PrevState,
  formData: FormData
) {
  const tierId = formData.get('id');
  if (!tierId || typeof tierId !== 'string') {
    return {
      success: false,
      error: "Invalid membership tier ID"
    };
  }

  const supabase = await createClient();

  try {
    // Get the membership tier and verify it exists
    const { exists, group_id } = await ProductService.getMembershipTierWithGroup(tierId);
    
    if (!exists) {
      return {
        success: false,
        error: "Membership tier not found"
      };
    }

    const { data: org, error: orgError } = await supabase
      .from("group")
      .select("slug")
      .eq("id", group_id)
      .single();

    if (orgError) {
      return {
        success: false,
        error: orgError.message
      };
    }

    // Delete the membership tier
    await ProductService.deleteMembershipTier(tierId);

    revalidatePath(`/@${org.slug}/membership`);
    return {
      success: true
    };

  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      error: error.message || "An error occurred while deleting the membership tier"
    };
  }
}

// Add new membership status management actions
export async function updateMembershipStatusAction(
  prevState: PrevState,
  formData: FormData
) {
  const membershipId = formData.get('membershipId');
  const status = formData.get('status');

  if (!membershipId || typeof membershipId !== 'string') {
    return {
      success: false,
      error: "Invalid membership ID"
    };
  }

  if (!status || typeof status !== 'string' || !Object.values(MembershipStatus).includes(status as MembershipStatus)) {
    return {
      success: false,
      error: "Invalid membership status"
    };
  }

  try {
    const membership = await MembershipService.updateMembershipStatus(
      membershipId,
      status as MembershipStatus
    );

    // Get org slug for revalidation
    const supabase = await createClient();
    const { data: groupUser } = await supabase
      .from("group_users")
      .select("group:groups!inner(slug)")
      .eq("id", membership.group_user_id)
      .single() as { data: GroupUserWithGroup | null };

    if (groupUser?.group?.slug) {
      revalidatePath(`/@${groupUser.group.slug}/membership`);
    }

    return {
      success: true,
      data: membership
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update membership status"
    };
  }
}

export async function updateMembershipDatesAction(
  prevState: PrevState,
  formData: FormData
) {
  const membershipId = formData.get('membershipId');
  const startDate = formData.get('startDate');
  const endDate = formData.get('endDate');

  if (!membershipId || typeof membershipId !== 'string') {
    return {
      success: false,
      error: "Invalid membership ID"
    };
  }

  try {
    const membership = await MembershipService.updateMembershipDates(
      membershipId,
      {
        start_date: startDate?.toString() || undefined,
        end_date: endDate?.toString() || undefined
      }
    );

    // Get org slug for revalidation
    const supabase = await createClient();
    const { data: groupUser } = await supabase
      .from("group_users")
      .select("group:groups!inner(slug)")
      .eq("id", membership.group_user_id)
      .single() as { data: GroupUserWithGroup | null };

    if (groupUser?.group?.slug) {
      revalidatePath(`/@${groupUser.group.slug}/membership`);
    }

    return {
      success: true,
      data: membership
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update membership dates"
    };
  }
}
