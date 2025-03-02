import { createClient, createServiceRoleClient } from "@/lib/utils/supabase/server";
import { Membership, MembershipStatus, MembershipTier, IMembership } from "@/lib/types/membership";
import { MemberIdService } from "@/services/member-id.service";
import { ProductService } from "@/services/product.service";
import { IMembershipTierProduct } from "@/lib/types/product";
import { Database } from "@/lib/types/database.types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withPermissions } from "@/lib/utils/action-permissions";
import { permissions } from "@/lib/types/permissions";

type FormTemplate = Database['public']['Tables']['form_templates']['Row'];

const membershipTierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  group_id: z.string(),
  activation_type: z.enum([
    'automatic',
    'review_required',
    'payment_required',
    'review_then_payment',
    'form_required',
    'form_then_payment',
    'form_then_review',
    'form_then_payment_then_review',
    'form_then_review_then_payment'
  ]).default('automatic'),
  member_id_format: z.string().min(1, "Member ID format is required").default('MEM-{YYYY}-{SEQ:3}'),
  form_template_id: z.string().optional().nullable()
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

export class MembershipService {
  static async getMembership(id: string): Promise<Membership | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getMembershipByOrderId(orderId: string): Promise<Membership | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("order_id", orderId)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async createMembership(data: {
    order_id: string;
    group_user_id: string;
    tier_id: string;
    start_date?: string;
    end_date?: string;
    metadata?: Record<string, any>;
  }): Promise<Membership> {
    const supabase = await createClient();

    // Start a transaction
    await supabase.rpc('begin_transaction');
    
    try {
      // Get group ID from group_user
      const { data: groupUser, error: groupUserError } = await supabase
        .from("group_users")
        .select("group_id")
        .eq("id", data.group_user_id)
        .single();

      if (groupUserError) throw groupUserError;

      // Get member ID format from membership tier settings
      const { data: tierSettings, error: tierError } = await supabase
        .from("membership_tier_settings")
        .select("member_id_format")
        .eq("tier_id", data.tier_id)
        .single();

      if (tierError) throw tierError;

      // Create membership record
      const { data: membership, error: membershipError } = await supabase
        .from("memberships")
        .insert({
          ...data,
          status: MembershipStatus.ACTIVE
        })
        .select()
        .single();
    
      if (membershipError) throw membershipError;

      // Generate member ID
      const memberId = await MemberIdService.generateMemberId(
        groupUser.group_id,
        tierSettings.member_id_format
      );

      // Assign member ID to membership
      await MemberIdService.assignMemberIdToMembership(
        membership.id,
        memberId
      );

      // Commit transaction
      await supabase.rpc('commit_transaction');

      return membership;
    } catch (error) {
      // Rollback on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  static async updateMembershipStatus(id: string, status: MembershipStatus): Promise<Membership> {
    const supabase = await createClient();
    
    const { data: membership, error } = await supabase
      .from("memberships")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return membership;
  }

  static async updateMembershipDates(id: string, data: {
    start_date?: string;
    end_date?: string;
  }): Promise<Membership> {
    const supabase = await createClient();
    
    const { data: membership, error } = await supabase
      .from("memberships")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return membership;
  }

  static async getMembershipsByGroupUser(groupUserId: string): Promise<Membership[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("group_user_id", groupUserId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getActiveMembershipCount(groupId: string): Promise<number> {
    const supabase = await createClient();
    
    const { count, error } = await supabase
      .from("memberships")
      .select("*", { count: 'exact', head: true })
      .eq("status", MembershipStatus.ACTIVE)
      .eq("group_id", groupId);
    
    if (error) throw error;
    return count || 0;
  }

  static async getMembershipTierAndForm(tierId: string): Promise<{ tier: IMembershipTierProduct, formTemplate: FormTemplate }> {
    const tier = await ProductService.getMembershipTier(tierId);
    if (!tier || !tier.membership_tier.form_template_id) {
      throw new Error('No form template id found for this membership tier');
    }
    console.log('tier', tier);
    const supabase = await createServiceRoleClient();
    console.log('tier.membership_tier.form_template_id', tier.membership_tier.form_template_id);
    const { data: formTemplate, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('id', tier.membership_tier.form_template_id)
      .single();

    if (error || !formTemplate) {
      console.error('Error fetching form template:', error);
      throw new Error('Error fetching form template');
    }

    return { tier, formTemplate };
  }

  static async checkExistingMembership(userId: string, groupId: string, tierId: string): Promise<{ 
    hasMembership: boolean;
    hasApplication: boolean;
    applicationId?: string;
    membershipId?: string;
  }> {
    const supabase = await createClient();

    // First get the group_user record
    const { data: groupUser, error: groupUserError } = await supabase
      .from('group_users')
      .select('id')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .single();

    if (groupUserError && groupUserError.code !== 'PGRST116') {
      throw groupUserError;
    }

    if (!groupUser) {
      return { hasMembership: false, hasApplication: false };
    }

    // Check for active membership
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('id')
      .eq('group_user_id', groupUser.id)
      .eq('tier_id', tierId)
      .eq('status', 'active')
      .single();

    if (membershipError && membershipError.code !== 'PGRST116') {
      throw membershipError;
    }

    // Check for pending application
    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .select('id')
      .eq('group_user_id', groupUser.id)
      .eq('tier_id', tierId)
      .eq('status', 'pending')
      .single();

    if (applicationError && applicationError.code !== 'PGRST116') {
      throw applicationError;
    }

    return {
      hasMembership: !!membership,
      hasApplication: !!application,
      membershipId: membership?.id,
      applicationId: application?.id
    };
  }

  static async getMembershipsByGroup(groupId: string): Promise<IMembership[]> {
    const supabase = await createClient();

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

  static async createMembershipTier(
    prevState: PrevState,
    formData: FormData,
  ) {
    const handler = await withPermissions(
      async (context: { userId: string; groupId: string }, params: { formData: FormData }) => {
        const rawFormData = Object.fromEntries(params.formData.entries());
        const formDataObj = {
          ...rawFormData,
          price: Number(params.formData.get("price")),
          duration_months: Number(params.formData.get("duration_months")),
          activation_type: params.formData.get("activation_type") || 'automatic',
          currency: params.formData.get("currency") || "USD",
          member_id_format: params.formData.get("member_id_format") || 'MEM-{YYYY}-{SEQ:3}',
          form_template_id: params.formData.get("form_template_id") || null,
          group_id: context.groupId
        };

        // Validate activation type based on price and form template
        const validationError = this.validateActivationType(
          formDataObj.price, 
          formDataObj.activation_type as string,
          formDataObj.form_template_id as string | null
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

        try {
          const product = await ProductService.createMembershipTier(
            context.groupId,
            {
              name: parsedFormData.data.name,
              description: parsedFormData.data.description || null,
              price: parsedFormData.data.price,
              currency: parsedFormData.data.currency,
              duration_months: parsedFormData.data.duration_months,
              activation_type: parsedFormData.data.activation_type,
              member_id_format: parsedFormData.data.member_id_format,
              form_template_id: parsedFormData.data.form_template_id
            }
          );

          revalidatePath(`/@${parsedFormData.data.group_id}/membership`);
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
      },
      (params: { formData: FormData }) => ({
        groupId: params.formData.get('group_id') as string,
        requiredPermissions: permissions.memberships.create
      })
    );

    return handler(prevState, { formData });
  }

  static async updateMembershipTier(
    prevState: PrevState,
    formData: FormData,
  ) {
    const handler = await withPermissions(
      async (context: { userId: string; groupId: string }, params: { formData: FormData }) => {
        const rawFormData = Object.fromEntries(params.formData.entries());
        const formDataObj = {
          ...rawFormData,
          price: Number(rawFormData.price),
          duration_months: Number(rawFormData.duration_months),
          activation_type: rawFormData.activation_type || 'automatic',
          currency: rawFormData.currency || "USD",
          member_id_format: rawFormData.member_id_format || 'MEM-{YYYY}-{SEQ:3}',
          form_template_id: rawFormData.form_template_id || null
        };

        // Validate activation type based on price and form template
        const validationError = this.validateActivationType(
          formDataObj.price, 
          formDataObj.activation_type as string,
          formDataObj.form_template_id as string | null
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

        try {
          const product = await ProductService.updateMembershipTier(
            parsedFormData.data.id,
            {
              name: parsedFormData.data.name,
              description: parsedFormData.data.description || null,
              price: parsedFormData.data.price,
              currency: parsedFormData.data.currency,
              duration_months: parsedFormData.data.duration_months,
              activation_type: parsedFormData.data.activation_type,
              member_id_format: parsedFormData.data.member_id_format,
              form_template_id: parsedFormData.data.form_template_id
            }
          );

          revalidatePath(`/@${context.groupId}/membership`);
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
      },
      (params: { formData: FormData }) => ({
        moduleId: params.formData.get('id') as string,
        moduleType: 'membership_tier' as const,
        requiredPermissions: permissions.memberships.edit
      })
    );

    return handler(prevState, { formData });
  }

  static async deleteMembershipTier(
    prevState: PrevState,
    formData: FormData
  ) {
    const handler = await withPermissions(
      async (context: { userId: string; groupId: string }, params: { formData: FormData }) => {
        const tierId = params.formData.get('id');
        if (!tierId || typeof tierId !== 'string') {
          return {
            success: false,
            error: "Invalid membership tier ID"
          };
        }

        try {
          const supabase = await createClient();
          
          // Soft delete by setting deleted_at timestamp
          const { error } = await supabase
            .from("products")
            .update({ 
              is_deleted: true,
              deleted_at: new Date().toISOString(),
              deleted_by: context.userId
            })
            .eq("id", tierId)
            .eq("type", "membership_tier");

          if (error) {
            throw error;
          }

          revalidatePath(`/@${context.groupId}/membership`);
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
      },
      (params: { formData: FormData }) => ({
        moduleId: params.formData.get('id') as string,
        moduleType: 'membership_tier' as const,
        requiredPermissions: permissions.memberships.delete
      })
    );

    return handler(prevState, { formData });
  }

  static async deleteMembership(
    prevState: PrevState,
    formData: FormData
  ) {
    const handler = await withPermissions(
      async (context: { userId: string; groupId: string }, params: { formData: FormData }) => {
        const membershipId = params.formData.get('id');
        if (!membershipId || typeof membershipId !== 'string') {
          return {
            success: false,
            error: "Invalid membership ID"
          };
        }

        try {
          const supabase = await createClient();
          
          // Delete the membership
          const { error } = await supabase
            .from("memberships")
            .delete()
            .eq("id", membershipId);

          if (error) {
            throw error;
          }

          revalidatePath(`/@${context.groupId}/membership`);
          return {
            success: true
          };
        } catch (error: any) {
          console.error(error);
          return {
            success: false,
            error: error.message || "An error occurred while deleting the membership"
          };
        }
      },
      (params: { formData: FormData }) => ({
        moduleId: params.formData.get('id') as string,
        moduleType: 'membership',
        requiredPermissions: permissions.memberships.delete
      })
    );

    return handler(prevState, { formData });
  }

  private static validateActivationType(price: number, activationType: string, formTemplateId: string | null) {
    if (price === 0) {
      // Free memberships can't require payment
      if (activationType === 'payment_required' || 
          activationType === 'review_then_payment' ||
          activationType === 'form_then_payment' ||
          activationType === 'form_then_payment_then_review') {
        return "Free memberships cannot require payment";
      }
    } else {
      // Paid memberships must require payment, review, or both
      if (activationType === 'automatic' || activationType === 'form_required') {
        return "Paid memberships must require payment, review, or both";
      }
    }

    // Form-based activation types require a form template
    if (activationType.includes('form') && !formTemplateId) {
      return "Form-based activation types require a form template";
    }

    return null;
  }
}

export async function getMembershipTiers({ orgId }: { orgId: string }): Promise<MembershipTier[]> {
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

export async function createMembershipTier(data: {
  name: string;
  description?: string;
  price: number;
  duration_months: number;
  group_id: string;
  activation_type: 'immediate' | 'manual';
}) {
  const supabase = await createClient();

  const { data: tier, error } = await supabase
    .from("membership_tier")
    .insert({
      name: data.name,
      description: data.description,
      price: data.price,
      duration_months: data.duration_months,
      group_id: data.group_id,
      activation_type: data.activation_type
    })
    .select()
    .single();

  if (error) throw error;
  return tier;
}

export async function updateMembershipTier(id: string, data: {
  name?: string;
  description?: string;
  price?: number;
  duration_months?: number;
  activation_type?: 'immediate' | 'manual';
}) {
  const supabase = await createClient();

  const { data: tier, error } = await supabase
    .from("membership_tier")
    .update({
      name: data.name,
      description: data.description,
      price: data.price,
      duration_months: data.duration_months,
      activation_type: data.activation_type
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return tier;
}

export async function deleteMembershipTier(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("membership_tier")
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getMemberships({ orgId }: { orgId: string }): Promise<MembershipTier[]> {
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
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Add member count to each tier
  return tiers.map(tier => ({
    ...tier,
    member_count: tier.memberships?.length || 0
  }));
}
