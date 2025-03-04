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
  target_type: z.enum(['USER', 'ORGANIZATION']).default('USER'),
  member_id_format: z.string().min(1, "Member ID format is required").default('MEM-{YYYY}-{SEQ:3}'),
  form_template_id: z.string().optional().nullable(),
  roles: z.array(z.string()).default([])
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
  if (activationType.includes('form') && (formTemplateId === null || formTemplateId === '')) {
    return "Form-based activation types require a form template";
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

        const parsedFormData = membershipTierSchema.safeParse({
          ...formDataObj,
          price,
          duration_months,
          roles
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
            activation_type: parsedFormData.data.activation_type,
            member_id_format: parsedFormData.data.member_id_format,
            form_template_id: parsedFormData.data.form_template_id,
            roles: parsedFormData.data.roles,
            target_type: parsedFormData.data.target_type
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
  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }, params: unknown): Promise<ActionResult<unknown>> => {
      try {
        const formDataObj = Object.fromEntries(formData.entries());
        const price = parseInt(formDataObj.price as string);
        const duration_months = parseInt(formDataObj.duration_months as string);
        const newRoles = JSON.parse(formDataObj.roles as string);
        const currentRoles = JSON.parse(formDataObj.current_roles as string || '[]');
        
        // Handle form_template_id - convert 'null' string to actual null
        let formTemplateId: string | null = formDataObj.form_template_id as string;
        if (!formTemplateId || formTemplateId === 'null' || formTemplateId === '') {
          formTemplateId = null;
        }

        const parsedFormData = membershipTierUpdateSchema.safeParse({
          ...formDataObj,
          price,
          duration_months,
          roles: newRoles,
          form_template_id: formTemplateId
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
            form_template_id: parsedFormData.data.form_template_id || null,
            target_type: parsedFormData.data.target_type,
            rolesToAdd,
            rolesToRemove
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
