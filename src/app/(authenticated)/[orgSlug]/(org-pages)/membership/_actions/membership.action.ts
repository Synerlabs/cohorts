"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/utils/supabase/server";
import { z } from "zod";
import snakecaseKeys from "snakecase-keys";
import { ProductService } from "@/services/product.service";
import { IMembershipTierProduct } from "@/lib/types/product";

const membershipTierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  group_id: z.string(),
  activation_type: z.enum(['automatic', 'review_required', 'payment_required', 'review_then_payment']).default('automatic'),
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
): Promise<IMembershipTierProduct[]> {
  return await ProductService.getMembershipTiers(orgId);
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
        description: parsedFormData.data.description,
        price: parsedFormData.data.price,
        currency: parsedFormData.data.currency,
        duration_months: parsedFormData.data.duration_months,
        activation_type: parsedFormData.data.activation_type,
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
