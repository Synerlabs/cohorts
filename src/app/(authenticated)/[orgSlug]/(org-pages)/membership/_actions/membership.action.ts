"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/utils/supabase/server";
import { z } from "zod";
import snakecaseKeys from "snakecase-keys";
import { MembershipActivationType, Membership } from "@/lib/types/membership";

const membershipSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  group_id: z.string(),
  activation_type: z.nativeEnum(MembershipActivationType).default(MembershipActivationType.AUTOMATIC),
  is_active: z.boolean().default(true),
});

const membershipUpdateSchema = membershipSchema
  .extend({
    id: z.string(),
  })
  .omit({ group_id: true });

type PrevState = {
  message?: string;
  issues?: any[];
  fields?: any[];
} | null;

export async function getMembershipsAction(
  orgId: string,
): Promise<Membership[]> {
  const supabase = await createClient();

  const { data: memberships, error } = await supabase
    .from("membership")
    .select(
      `
      *,
      membership_role (
        group_role_id,
        group_roles (
          name,
          id
        )
      )
    `,
    )
    .eq("group_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return memberships;
}

function validateActivationType(price: number, activationType: MembershipActivationType) {
  if (price === 0) {
    if (activationType === MembershipActivationType.PAYMENT_REQUIRED || 
        activationType === MembershipActivationType.REVIEW_THEN_PAYMENT) {
      return "Free memberships cannot require payment";
    }
  } else {
    if (activationType === MembershipActivationType.AUTOMATIC) {
      return "Paid memberships must require payment, review, or both";
    }
  }
  return null;
}

export async function createMembershipAction(
  prevState: PrevState,
  formData: FormData,
) {
  const rawFormData = Object.fromEntries(formData.entries());
  const formDataObj = {
    ...rawFormData,
    price: Number(rawFormData.price),
    duration_months: Number(rawFormData.duration_months),
    is_active: true,
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

  const parsedFormData = membershipSchema.safeParse(formDataObj);

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
    .from("membership")
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

export async function updateMembershipAction(
  prevState: PrevState,
  formData: FormData,
) {
  const rawFormData = Object.fromEntries(formData.entries());
  const formDataObj = {
    ...rawFormData,
    price: Number(rawFormData.price),
    duration_months: Number(rawFormData.duration_months),
    is_active: true,
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

  const parsedFormData = membershipUpdateSchema.safeParse(formDataObj);

  if (!parsedFormData.success) {
    return {
      error: parsedFormData.error.errors[0].message,
      success: false,
    };
  }

  const supabase = await createClient();

  try {
    const { data: membership, error: membershipError } = await supabase
      .from("membership")
      .select("group_id")
      .eq("id", parsedFormData.data.id)
      .single();

    if (membershipError) throw membershipError;

    const { data: org, error: orgError } = await supabase
      .from("group")
      .select("slug")
      .eq("id", membership.group_id)
      .single();

    if (orgError) throw orgError;

    const { data, error } = await supabase
      .from("membership")
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
      error: error.message || "An error occurred while updating the membership",
      success: false,
    };
  }
}
