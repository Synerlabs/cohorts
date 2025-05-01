"use server";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/utils/supabase/server";
import { z } from "zod";
import snakecaseKeys from "snakecase-keys";
import { ProductService } from "@/services/product.service";
import { IMembershipTierProduct } from "@/lib/types/product";
import { MembershipService } from "@/services/membership.service";
import { MembershipStatus } from "@/lib/types/membership";
import { permissions } from "@/lib/types/permissions";
import { withPermissions } from "@/lib/utils/action-permissions";
import { createServiceRoleClient as createSupabaseServiceRoleClient } from "@/lib/utils/supabase/server";
import { unstable_noStore as noStore } from "next/cache";
import { Membership } from '@/lib/types/membership';
import { Database } from "@/lib/types/database.types";
import { Currency, MembershipActivationType } from '@/lib/types/membership';
import { calculateMembershipDates } from '@/lib/utils/membership-dates';

const membershipTierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  duration_unit: z.enum(['month', 'year'] as const).default('month'),
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
  form_template_id: z.string().optional().nullable(),
  roles: z.array(z.string()).default([]),
  type: z.enum(['membership', 'organization'] as const).default('membership'),
  // Duration settings
  has_fixed_dates: z.boolean().default(false),
  fixed_start_date: z.string().nullable().optional(),
  fixed_end_date: z.string().nullable().optional(),
  is_fiscal_period: z.boolean().default(false),
  fiscal_start_month: z.number().nullable().optional(),
  fiscal_start_day: z.number().nullable().optional(),
  has_monthly_cycle: z.boolean().default(false),
  monthly_start_day: z.number().nullable().optional(),
  monthly_end_day_type: z.enum(['specific', 'last_day'] as const).default('specific'),
  monthly_end_day: z.number().nullable().optional()
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
  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }) => {
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
        .eq('group_user.group_id', context.groupId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return { success: true, data: data as IMembership[] };
    },
    () => ({
      groupId,
      requiredPermissions: permissions.memberships.view
    })
  );

  const result = await handler(null, {});
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch memberships");
  }
  return result.data;
}

function validateActivationType(price: number, activationType: string, formTemplateId: string | null) {
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
  if (activationType.includes('form')) {
    if (!formTemplateId) {
      return "Form-based activation types require a form template";
    }
  }

  return null;
}

interface ActionContext {
  groupId: string;
  permission: string;
  moduleType: string;
  moduleId?: string;
  requiredPermissions?: string[];
}

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createMembershipTierAction(
  prevState: PrevState,
  formData: FormData,
) {
  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }, params: unknown): Promise<ActionResult<unknown>> => {
      try {
        const formDataObj = Object.fromEntries(formData.entries());
        const price = parseInt(formDataObj.price as string);
        const duration_months = parseInt(formDataObj.duration_months as string);
        const roles = JSON.parse(formDataObj.roles as string);
        
        // Handle form_template_id properly - convert 'null' string to actual null
        let formTemplateId: string | null = formDataObj.form_template_id as string;
        if (!formTemplateId || formTemplateId === 'null' || formTemplateId === '') {
          formTemplateId = null;
        }

        // Parse duration unit (ensuring it has a value)
        const duration_unit = (formDataObj.duration_unit as string) || 'month';

        // Parse boolean values
        const has_fixed_dates = formDataObj.has_fixed_dates === 'true';
        const is_fiscal_period = formDataObj.is_fiscal_period === 'true';
        const has_monthly_cycle = formDataObj.has_monthly_cycle === 'true';

        // Handle date fields
        let fixed_start_date: string | null = formDataObj.fixed_start_date as string;
        if (!fixed_start_date || fixed_start_date === 'null' || fixed_start_date === '') {
          fixed_start_date = null;
        }

        let fixed_end_date: string | null = formDataObj.fixed_end_date as string;
        if (!fixed_end_date || fixed_end_date === 'null' || fixed_end_date === '') {
          fixed_end_date = null;
        }

        // Parse nullable number values - handling 'null' string values
        const fiscal_start_month = formDataObj.fiscal_start_month === 'null' || !formDataObj.fiscal_start_month 
          ? null 
          : parseInt(formDataObj.fiscal_start_month as string);
          
        const fiscal_start_day = formDataObj.fiscal_start_day === 'null' || !formDataObj.fiscal_start_day 
          ? null 
          : parseInt(formDataObj.fiscal_start_day as string);
          
        const monthly_start_day = formDataObj.monthly_start_day === 'null' || !formDataObj.monthly_start_day 
          ? null 
          : parseInt(formDataObj.monthly_start_day as string);
          
        const monthly_end_day = formDataObj.monthly_end_day === 'null' || !formDataObj.monthly_end_day 
          ? null 
          : parseInt(formDataObj.monthly_end_day as string);

        const parsedFormData = membershipTierSchema.safeParse({
          ...formDataObj,
          price,
          duration_months,
          duration_unit,
          roles,
          form_template_id: formTemplateId,
          has_fixed_dates,
          is_fiscal_period,
          has_monthly_cycle,
          fixed_start_date,
          fixed_end_date,
          fiscal_start_month,
          fiscal_start_day,
          monthly_start_day,
          monthly_end_day_type: formDataObj.monthly_end_day_type as 'specific' | 'last_day' || 'specific',
          monthly_end_day
        });

        if (!parsedFormData.success) {
          return {
            success: false,
            error: "Invalid form data",
            data: { issues: parsedFormData.error.issues }
          };
        }

        // Validate activation type based on price and form template
        const activationTypeError = validateActivationType(
          parsedFormData.data.price,
          parsedFormData.data.activation_type,
          parsedFormData.data.form_template_id || null
        );

        if (activationTypeError) {
          return {
            success: false,
            error: activationTypeError
          };
        }

        const product = await ProductService.createMembershipTier(
          parsedFormData.data.group_id,
          {
            name: parsedFormData.data.name,
            description: parsedFormData.data.description || null,
            price: parsedFormData.data.price,
            currency: parsedFormData.data.currency,
            duration_months: parsedFormData.data.duration_months,
            duration_unit: parsedFormData.data.duration_unit,
            activation_type: parsedFormData.data.activation_type,
            member_id_format: parsedFormData.data.member_id_format,
            form_template_id: parsedFormData.data.form_template_id,
            roles: parsedFormData.data.roles,
            type: parsedFormData.data.type || 'membership',
            // Include duration settings
            has_fixed_dates: parsedFormData.data.has_fixed_dates,
            fixed_start_date: parsedFormData.data.fixed_start_date,
            fixed_end_date: parsedFormData.data.fixed_end_date,
            is_fiscal_period: parsedFormData.data.is_fiscal_period,
            fiscal_start_month: parsedFormData.data.fiscal_start_month,
            fiscal_start_day: parsedFormData.data.fiscal_start_day,
            has_monthly_cycle: parsedFormData.data.has_monthly_cycle,
            monthly_start_day: parsedFormData.data.monthly_start_day,
            monthly_end_day_type: parsedFormData.data.monthly_end_day_type,
            monthly_end_day: parsedFormData.data.monthly_end_day
          }
        );

        revalidatePath(`/[orgSlug]/membership`, "page");

        return {
          success: true,
          data: product,
          error: undefined
        };
      } catch (error: any) {
        console.error("Error creating membership tier:", error);

        return {
          success: false,
          error: error.message || "Failed to create membership tier"
        };
      }
    },
    () => ({
      groupId: formData.get("group_id") as string,
      permission: permissions.group.edit,
      moduleType: 'membership_tier' as const,
      requiredPermissions: [permissions.group.edit]
    })
  );

  return handler(null, {});
}

export async function updateMembershipTierAction(
  prevState: PrevState,
  formData: FormData,
) {
  // Log the form data for debugging
  console.log('Update Membership Tier Action - Form Data:', Object.fromEntries(formData.entries()));

  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }, params: unknown): Promise<ActionResult<unknown>> => {
      try {
        const formDataObj = Object.fromEntries(formData.entries());
        const price = parseInt(formDataObj.price as string);
        const duration_months = parseInt(formDataObj.duration_months as string);
        const newRoles = JSON.parse(formDataObj.roles as string);
        const currentRoles = JSON.parse(formDataObj.current_roles as string || '[]');
        
        // Handle form_template_id properly - convert 'null' string to actual null
        let formTemplateId: string | null = formDataObj.form_template_id as string;
        if (!formTemplateId || formTemplateId === 'null' || formTemplateId === '') {
          formTemplateId = null;
        }

        // Parse duration unit (ensuring it has a value)
        const duration_unit = (formDataObj.duration_unit as string) || 'month';

        // Parse boolean values
        const has_fixed_dates = formDataObj.has_fixed_dates === 'true';
        const is_fiscal_period = formDataObj.is_fiscal_period === 'true';
        const has_monthly_cycle = formDataObj.has_monthly_cycle === 'true';

        // Handle date fields
        let fixed_start_date: string | null = formDataObj.fixed_start_date as string;
        if (!fixed_start_date || fixed_start_date === 'null' || fixed_start_date === '') {
          fixed_start_date = null;
        }

        let fixed_end_date: string | null = formDataObj.fixed_end_date as string;
        if (!fixed_end_date || fixed_end_date === 'null' || fixed_end_date === '') {
          fixed_end_date = null;
        }

        // Parse nullable number values - handling 'null' string values
        const fiscal_start_month = formDataObj.fiscal_start_month === 'null' || !formDataObj.fiscal_start_month 
          ? null 
          : parseInt(formDataObj.fiscal_start_month as string);
          
        const fiscal_start_day = formDataObj.fiscal_start_day === 'null' || !formDataObj.fiscal_start_day 
          ? null 
          : parseInt(formDataObj.fiscal_start_day as string);
          
        const monthly_start_day = formDataObj.monthly_start_day === 'null' || !formDataObj.monthly_start_day 
          ? null 
          : parseInt(formDataObj.monthly_start_day as string);
          
        const monthly_end_day = formDataObj.monthly_end_day === 'null' || !formDataObj.monthly_end_day 
          ? null 
          : parseInt(formDataObj.monthly_end_day as string);

        const parsedFormData = membershipTierUpdateSchema.safeParse({
          ...formDataObj,
          price,
          duration_months,
          duration_unit,
          roles: newRoles,
          form_template_id: formTemplateId,
          has_fixed_dates,
          is_fiscal_period,
          has_monthly_cycle,
          fixed_start_date,
          fixed_end_date,
          fiscal_start_month,
          fiscal_start_day,
          monthly_start_day,
          monthly_end_day_type: formDataObj.monthly_end_day_type as 'specific' | 'last_day' || 'specific',
          monthly_end_day
        });

        if (!parsedFormData.success) {
          return {
            success: false,
            error: "Invalid form data",
            data: { issues: parsedFormData.error.issues }
          };
        }

        // Validate activation type based on price and form template
        const activationTypeError = validateActivationType(
          parsedFormData.data.price,
          parsedFormData.data.activation_type,
          parsedFormData.data.form_template_id || null
        );

        if (activationTypeError) {
          return {
            success: false,
            error: activationTypeError
          };
        }

        // Calculate roles to add and remove
        const rolesToAdd = newRoles.filter((roleId: string) => !currentRoles.includes(roleId));
        const rolesToRemove = currentRoles.filter((roleId: string) => !newRoles.includes(roleId));

        // Log the parsed form data for debugging
        console.log('Parsed form data for membership tier update:', {
          id: parsedFormData.data.id,
          type: parsedFormData.data.type,
          name: parsedFormData.data.name,
          // Add other relevant fields
        });

        const product = await ProductService.updateMembershipTier(
          parsedFormData.data.id,
          {
            name: parsedFormData.data.name,
            description: parsedFormData.data.description || null,
            price: parsedFormData.data.price,
            currency: parsedFormData.data.currency,
            duration_months: parsedFormData.data.duration_months,
            duration_unit: parsedFormData.data.duration_unit,
            activation_type: parsedFormData.data.activation_type,
            member_id_format: parsedFormData.data.member_id_format,
            form_template_id: parsedFormData.data.form_template_id || null,
            rolesToAdd,
            rolesToRemove,
            type: parsedFormData.data.type,
            // Include duration settings
            has_fixed_dates: parsedFormData.data.has_fixed_dates,
            fixed_start_date: parsedFormData.data.fixed_start_date,
            fixed_end_date: parsedFormData.data.fixed_end_date,
            is_fiscal_period: parsedFormData.data.is_fiscal_period,
            fiscal_start_month: parsedFormData.data.fiscal_start_month,
            fiscal_start_day: parsedFormData.data.fiscal_start_day,
            has_monthly_cycle: parsedFormData.data.has_monthly_cycle,
            monthly_start_day: parsedFormData.data.monthly_start_day,
            monthly_end_day_type: parsedFormData.data.monthly_end_day_type,
            monthly_end_day: parsedFormData.data.monthly_end_day
          }
        );

        revalidatePath(`/[orgSlug]/membership`, "page");

        return {
          success: true,
          data: product,
          error: undefined
        };
      } catch (error: any) {
        console.error("Error updating membership tier:", error);

        return {
          success: false,
          error: error.message || "An error occurred while updating the membership tier"
        };
      }
    },
    () => ({
      groupId: formData.get("group_id") as string,
      permission: permissions.group.edit,
      moduleType: 'membership_tier' as const,
      requiredPermissions: [permissions.group.edit]
    })
  );

  return handler(null, {});
}

export async function deleteMembershipTierAction(
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

// Add new membership status management actions
export async function updateMembershipStatusAction(
  prevState: PrevState,
  formData: FormData
) {
  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }, params: { formData: FormData }) => {
      const membershipId = params.formData.get('membershipId');
      const status = params.formData.get('status');

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

        revalidatePath(`/@${context.groupId}/membership`);
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
    },
    (params: { formData: FormData }) => ({
      moduleId: params.formData.get('membershipId') as string,
      moduleType: 'membership',
      requiredPermissions: permissions.memberships.edit
    })
  );

  return handler(prevState, { formData });
}

export async function getMembershipTierStatsAction(tierId: string): Promise<{
  total_members: number;
  active_members: number;
  expiring_soon: number;
  pending_applications: number;
  pending_reviews: number;
  pending_payments: number;
  payments_pending_review: number;
}> {
  try {
    return await ProductService.getMembershipTierStats(tierId);
  } catch (error) {
    console.error('Error fetching membership tier stats:', error);
    return {
      total_members: 0,
      active_members: 0,
      expiring_soon: 0,
      pending_applications: 0,
      pending_reviews: 0,
      pending_payments: 0,
      payments_pending_review: 0
    };
  }
}

export async function updateMembershipDatesAction(
  prevState: PrevState,
  formData: FormData
) {
  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }, params: { formData: FormData }) => {
      const membershipId = params.formData.get('membershipId');
      const startDate = params.formData.get('startDate');
      const endDate = params.formData.get('endDate');

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

        revalidatePath(`/@${context.groupId}/membership`);
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
    },
    (params: { formData: FormData }) => ({
      moduleId: params.formData.get('membershipId') as string,
      moduleType: 'membership',
      requiredPermissions: permissions.memberships.edit
    })
  );

  return handler(prevState, { formData });
}

// Define a type for the data returned by joining tiers and products
type TierWithProductData = Database['public']['Tables']['membership_tiers']['Row'] & {
  product: Database['public']['Tables']['products']['Row']
};

// Define AND EXPORT a type for the data returned by the memberships query
export type MembershipWithTierAndProductName = Membership & {
  membership_tier: { 
    product: {
      name: string | null;
    }
  } | null; 
  member_id?: string | null; 
  status?: string; // Added based on usage in slideover
  start_date?: string | null; 
  end_date?: string | null; 
  created_at?: string | null; // Added from select *
};

export async function getTierAndMembershipDataForUser(
  orgId: string,
  userId: string
): Promise<{ tiers: IMembershipTierProduct[]; userMemberships: MembershipWithTierAndProductName[] }> { 
  noStore();
  const supabase = await createSupabaseServiceRoleClient();

  // Fetch available tiers by joining membership_tiers and products
  const { data: tiersData, error: tiersError } = await supabase
    .from('membership_tiers') 
    .select(`
      *,
      product:products!inner(*)
    `)
    .eq('product.group_id', orgId) 
    .eq('product.is_active', true)
    // Correct syntax for ordering by joined table column
    .order('name', { referencedTable: 'products', ascending: true }); 

  if (tiersError) {
    console.error("Error fetching membership tiers:", tiersError);
    // Throw the specific Supabase error for better debugging
    throw new Error(`Failed to fetch membership tiers: ${tiersError.message}`); 
  }

   // Map to expected IMembershipTierProduct structure (from src/lib/types/product.ts)
  const tiers: IMembershipTierProduct[] = tiersData?.map((tier: TierWithProductData) => ({
    ...(tier.product as Database['public']['Tables']['products']['Row']), // Spread product fields
    id: tier.product.id, 
    type: 'membership_tier', 
    group_id: tier.product.group_id || '', // Ensure group_id is non-nullable
    currency: tier.product.currency as Currency, 
    form_template_id: tier.form_template_id || '', 
    membership_tier: { 
      product_id: tier.product_id, 
      duration_months: tier.duration_months,
      duration_unit: tier.duration_unit as ('month' | 'year') || 'month', 
      activation_type: tier.activation_type as MembershipActivationType, // Use imported type
      type: tier.type as ('membership' | 'organization'), 
      has_fixed_dates: tier.has_fixed_dates ?? false,
      fixed_start_date: tier.fixed_start_date ?? null,
      fixed_end_date: tier.fixed_end_date ?? null,
      is_fiscal_period: tier.is_fiscal_period ?? false,
      fiscal_start_month: tier.fiscal_start_month ?? null,
      fiscal_start_day: tier.fiscal_start_day ?? null,
      has_monthly_cycle: tier.has_monthly_cycle ?? false,
      monthly_start_day: tier.monthly_start_day ?? null,
      monthly_end_day_type: tier.monthly_end_day_type as ('specific' | 'last_day') || 'specific', 
      monthly_end_day: tier.monthly_end_day ?? null,
    }
  })) || [];

  // Fetch the user's group_user_id first
  const { data: groupUserData, error: groupUserError } = await supabase
    .from('group_users')
    .select('id')
    .eq('user_id', userId)
    .eq('group_id', orgId)
    .maybeSingle();

  if (groupUserError) {
    console.error("Error fetching group user ID:", groupUserError);
    throw new Error(`Failed to fetch group user ID: ${groupUserError.message}`);
  }

  let userMemberships: MembershipWithTierAndProductName[] = [];

  // Only fetch memberships if the user is part of the group
  if (groupUserData) {
    const groupUserId = groupUserData.id;

    // Fetch the user's current memberships using group_user_id
    const { data: userMembershipsData, error: membershipsError } = await supabase
      .from('memberships')
      .select(`
        *,
        membership_tier:membership_tiers!inner(
          product:products!inner(name)
        )
      `)
      .eq('group_user_id', groupUserId) // Filter by group_user_id
      .order('created_at', { ascending: false });

    if (membershipsError) {
      console.error("Error fetching user memberships:", membershipsError);
      throw new Error(`Failed to fetch user memberships: ${membershipsError.message}`);
    }

    // Add type assertion for the fetched data
    userMemberships = userMembershipsData as MembershipWithTierAndProductName[] || [];
  }

  return { tiers, userMemberships };
}

// Action to assign a membership tier to a user directly
export async function assignMembershipAction(
  userId: string, // This is the target user ID
  orgId: string,
  tierId: string,
  // Add optional parameters for custom dates and member ID
  options?: {
    startDate?: string; // Custom start date (ISO string)
    endDate?: string;   // Custom end date (ISO string)
    memberId?: string;  // Custom member ID
  }
): Promise<{ success: boolean; error?: string }> { 
  noStore();
  
  const supabase = await createSupabaseServiceRoleClient();

  try {
    // 1. Get group_user record
    const { data: groupUser, error: groupUserError } = await supabase
      .from('group_users')
      .select('id, is_deleted') 
      .eq('user_id', userId)
      .eq('group_id', orgId)
      .maybeSingle(); 

    if (groupUserError) throw new Error(`Error fetching group user: ${groupUserError.message}`);
    if (!groupUser) throw new Error("User is not a member of this organization."); 
    if (groupUser.is_deleted) throw new Error("Cannot assign membership to a deleted member.");

    const groupUserId = groupUser.id;

    // 2. Get Tier Details
    const { data: tierData, error: tierError } = await supabase
      .from('membership_tiers')
      .select(`
        *,
        product:products!inner(currency, price, group_id) 
      `)
      .eq('product_id', tierId)
      .single();
      
    if (tierError) throw new Error(`Error fetching tier details: ${tierError.message}`);
    if (!tierData || !tierData.product) throw new Error("Membership tier not found.");
    if (tierData.product.group_id !== orgId) throw new Error("Tier does not belong to this organization."); 

    // 3. Check for existing ACTIVE membership for this tier
    const { count: existingActiveCount, error: existingCheckError } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('group_user_id', groupUserId)
      .eq('tier_id', tierId)
      .eq('status', MembershipStatus.ACTIVE); 

    if (existingCheckError) throw new Error(`Error checking existing memberships: ${existingCheckError.message}`);
    if (existingActiveCount && existingActiveCount > 0) {
      return { success: false, error: "User already has an active membership for this tier." };
    }

    // 4. Create Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        group_id: orgId,
        amount: 0, 
        currency: tierData.product.currency,
        status: 'completed', 
        type: 'membership',
      })
      .select('id')
      .single();

    if (orderError) throw new Error(`Error creating order: ${orderError.message}`);
    if (!order) throw new Error("Failed to create order record.");
    const orderId = order.id;

    // 5. Determine dates - use provided dates or calculate them
    let startDate, endDate;
    
    if (options?.startDate) {
      // Use provided start date
      startDate = new Date(options.startDate);
    } else {
      // Calculate start date using tier settings
      startDate = calculateMembershipDates({
        duration_months: tierData.duration_months,
        duration_unit: tierData.duration_unit as ('month' | 'year'),
        has_fixed_dates: tierData.has_fixed_dates,
        fixed_start_date: tierData.fixed_start_date,
        fixed_end_date: tierData.fixed_end_date,
        is_fiscal_period: tierData.is_fiscal_period,
        fiscal_start_month: tierData.fiscal_start_month,
        fiscal_start_day: tierData.fiscal_start_day,
        has_monthly_cycle: tierData.has_monthly_cycle,
        monthly_start_day: tierData.monthly_start_day,
        monthly_end_day_type: tierData.monthly_end_day_type as ('specific' | 'last_day'),
        monthly_end_day: tierData.monthly_end_day,
      }).startDate;
    }
    
    if (options?.endDate) {
      // Use provided end date
      endDate = new Date(options.endDate);
    } else if (startDate) {
      // Calculate end date using tier settings
      endDate = calculateMembershipDates({
        duration_months: tierData.duration_months,
        duration_unit: tierData.duration_unit as ('month' | 'year'),
        has_fixed_dates: tierData.has_fixed_dates,
        fixed_start_date: tierData.fixed_start_date,
        fixed_end_date: tierData.fixed_end_date,
        is_fiscal_period: tierData.is_fiscal_period,
        fiscal_start_month: tierData.fiscal_start_month,
        fiscal_start_day: tierData.fiscal_start_day,
        has_monthly_cycle: tierData.has_monthly_cycle,
        monthly_start_day: tierData.monthly_start_day,
        monthly_end_day_type: tierData.monthly_end_day_type as ('specific' | 'last_day'),
        monthly_end_day: tierData.monthly_end_day,
      }).endDate;
    }

    // 6. Create Membership Record
    const membershipData: any = {
      group_user_id: groupUserId,
      tier_id: tierId,
      order_id: orderId,
      start_date: startDate.toISOString(),
      end_date: endDate ? endDate.toISOString() : null,
      status: MembershipStatus.ACTIVE,
    };
    
    // Add member_id if provided
    if (options?.memberId) {
      membershipData.member_id = options.memberId;
    }

    const { error: membershipError } = await supabase
      .from('memberships')
      .insert(membershipData);

    if (membershipError) {
      // TODO: Rollback order?
      throw new Error(`Error creating membership: ${membershipError.message}`);
    }

    // 7. Revalidate relevant paths
    revalidatePath(`/(authenticated)/[orgSlug]/(org-pages)/members`, 'page'); 

    return { success: true };

  } catch (error: any) {
    console.error("Error assigning membership:", error);
    return { success: false, error: error.message || "An unknown error occurred during assignment." }; 
  }
}
