"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/utils/supabase/server";
import { z } from "zod";
import snakecaseKeys from "snakecase-keys";

const membershipSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  group_id: z.string(),
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

export type Membership = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
  is_active: boolean;
  created_at: string;
  group_id: string;
  created_by: string;
};

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

export async function createMembershipAction(
  prevState: PrevState,
  formData: FormData,
) {
  const rawFormData = Object.fromEntries(formData.entries());
  const formDataObj = {
    ...rawFormData,
    price: Number(rawFormData.price),
    duration_months: Number(rawFormData.duration_months),
  };

  const parsedFormData = membershipSchema.safeParse(formDataObj);

  if (!parsedFormData.success) {
    return {
      issues: parsedFormData.error.errors,
      message: "Validation failed",
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
      success: false,
      issues: orgError,
      message: orgError.message,
    };
  }

  const { data, error } = await supabase
    .from("membership")
    .insert(snakecaseKeys(parsedFormData.data))
    .select()
    .single();

  if (error) {
    return {
      success: false,
      issues: error,
      message: error.message,
    };
  }

  revalidatePath(`/${org.slug}/membership`);
  return {
    success: true,
    message: "Membership created successfully",
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
  };

  const parsedFormData = membershipUpdateSchema.safeParse(formDataObj);

  if (!parsedFormData.success) {
    return {
      issues: parsedFormData.error.errors,
      message: "Validation failed",
    };
  }

  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from("membership")
    .select("group_id")
    .eq("id", parsedFormData.data.id)
    .single();

  if (membershipError) {
    return {
      success: false,
      issues: membershipError,
      message: membershipError.message,
    };
  }

  const { data: org, error: orgError } = await supabase
    .from("group")
    .select("slug")
    .eq("id", membership.group_id)
    .single();

  if (orgError) {
    return {
      success: false,
      issues: orgError,
      message: orgError.message,
    };
  }

  const { data, error } = await supabase
    .from("membership")
    .update(snakecaseKeys(parsedFormData.data))
    .eq("id", parsedFormData.data.id)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      issues: error,
      message: error.message,
    };
  }

  revalidatePath(`/${org.slug}/membership`);
  return {
    success: true,
    message: "Membership updated successfully",
    data,
  };
}
