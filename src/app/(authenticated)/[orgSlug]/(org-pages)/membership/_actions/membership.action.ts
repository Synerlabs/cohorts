"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/utils/supabase/server";
import { z } from "zod";
import snakecaseKeys from "snakecase-keys";
import { MembershipActivationType, MembershipTier } from "@/lib/types/membership";

const membershipTierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  group_id: z.string(),
  activation_type: z.nativeEnum(MembershipActivationType).default(MembershipActivationType.AUTOMATIC),
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

export async function getMembershipTiersAction(
  orgId: string,
): Promise<MembershipTier[]> {
  const supabase = await createClient();

  const { data: tiers, error } = await supabase
    .from("membership_tier")
    .select(`
      *,
      memberships (
        id
      )
    `)
    .eq("group_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Add member count to each tier
  return tiers.map(tier => ({
    ...tier,
    member_count: tier.memberships?.length || 0
  }));
}

function validateActivationType(price: number, activationType: MembershipActivationType) {
  if (price === 0) {
    // Free memberships can only be automatic or review_required
    if (activationType === MembershipActivationType.PAYMENT_REQUIRED || 
        activationType === MembershipActivationType.REVIEW_THEN_PAYMENT) {
      return "Free memberships cannot require payment";
    }
  } else {
    // Paid memberships must require payment, review, or both
    if (activationType === MembershipActivationType.AUTOMATIC) {
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
    price: Number(rawFormData.price),
    activation_type: formData.get("activation_type") || MembershipActivationType.AUTOMATIC,
  };

  // Validate activation type based on price
  const validationError = validateActivationType(
    formDataObj.price, 
    formDataObj.activation_type as MembershipActivationType
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

  const { data, error } = await supabase
    .from("membership_tier")
    .insert(snakecaseKeys(parsedFormData.data))
    .select()
    .single();

  if (error) {
    return {
      error: error.message,
      success: false,
    };
  }

  revalidatePath(`/${org.slug}/membership`);
  return {
    success: true,
    data,
  };
}

export async function updateMembershipTierAction(
  prevState: PrevState,
  formData: FormData,
) {
  const rawFormData = Object.fromEntries(formData.entries());
  const formDataObj = {
    ...rawFormData,
    price: Number(rawFormData.price),
    activation_type: rawFormData.activation_type || MembershipActivationType.AUTOMATIC,
  };

  // Validate activation type based on price
  const validationError = validateActivationType(
    formDataObj.price, 
    formDataObj.activation_type as MembershipActivationType
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
    const { data: tier, error: tierError } = await supabase
      .from("membership_tier")
      .select("group_id")
      .eq("id", parsedFormData.data.id)
      .single();

    if (tierError) throw tierError;

    const { data: org, error: orgError } = await supabase
      .from("group")
      .select("slug")
      .eq("id", tier.group_id)
      .single();

    if (orgError) throw orgError;

    const { data, error } = await supabase
      .from("membership_tier")
      .update(snakecaseKeys(parsedFormData.data))
      .eq("id", parsedFormData.data.id)
      .select()
      .single();

    if (error) {
      // Handle database constraint violations
      if (error.code === '23514') { // PostgreSQL check constraint violation
        return {
          error: "Invalid activation type for this membership price",
          success: false,
        };
      }
      throw error;
    }

    revalidatePath(`/${org.slug}/membership`);
    return {
      success: true,
      data,
    };

  } catch (error: any) {
    console.error(error);
    return {
      error: error.message || "An error occurred while updating the membership tier",
      success: false,
    };
  }
}
