"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/utils/supabase/server";

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

export async function getMembershipsAction(orgId: string): Promise<Membership[]> {
  const supabase = createClient();

  const { data: memberships, error } = await supabase
    .from("membership")
    .select(`
      *,
      membership_role (
        group_role_id,
        group_roles (
          name,
          id
        )
      )
    `)
    .eq("group_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return memberships;
}

export type CreateMembershipData = {
  name: string;
  description?: string;
  price: number;
  duration_months: number;
  group_id: string;
  role_ids: string[];
};

export async function createMembershipAction(data: CreateMembershipData) {
  const supabase = await createClient();

  const { data: membership, error } = await supabase
    .from("membership")
    .insert({
      name: data.name,
      description: data.description,
      price: data.price,
      duration_months: data.duration_months,
      group_id: data.group_id,
    })
    .select()
    .single();

  if (error) throw error;

  // Create membership role associations
  if (data.role_ids.length > 0) {
    const { error: roleError } = await supabase.from("membership_role").insert(
      data.role_ids.map((roleId) => ({
        membership_id: membership.id,
        group_role_id: roleId,
      }))
    );

    if (roleError) throw roleError;
  }

  revalidatePath("/[orgSlug]/memberships");
  return membership;
} 