import { createClient } from "@/lib/utils/supabase/server";

export async function getMemberships({ orgId }: { orgId: string }) {
  const supabase = await createClient();

  const { data: memberships, error } = await supabase
    .from("membership")
    .select(
      `
      *,
      membership_role (
        group_role_id,
        group_roles (
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

export async function createMembership(data: {
  name: string;
  description?: string;
  price: number;
  duration_months: number;
  group_id: string;
  role_ids: string[];
}) {
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
      })),
    );

    if (roleError) throw roleError;
  }

  return membership;
}
