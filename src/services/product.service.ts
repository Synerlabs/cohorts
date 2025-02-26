import { Database } from '@/lib/types/database.types';
import { IMembershipTierProduct } from '@/lib/types/product';
import { createClient } from '@/lib/utils/supabase/server';

interface MembershipTierRole {
  id: string;
  group_roles: {
    id: string;
    role_name: string;
    permissions: string[];
  };
}

interface MembershipTierRoleWithDeleted extends MembershipTierRole {
  deleted_at?: string | null;
}

export class ProductService {
  static async getMembershipTier(id: string): Promise<IMembershipTierProduct> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        membership_tiers!inner (
          activation_type,
          duration_months,
          form_template_id,
          membership_tier_settings (
            member_id_format
          ),
          membership_tier_roles!left (
            id,
            group_roles (
              id,
              role_name,
              permissions
            )
          )
        )
      `)
      .eq('id', id)
      .eq('type', 'membership_tier')
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Membership tier not found');
    }

    console.log('Raw membership tier data:', JSON.stringify(data, null, 2));

    // Get form template if form_template_id exists
    let formTemplate;
    if (data.membership_tiers?.form_template_id) {
      const { data: templateData, error: templateError } = await supabase
        .from('form_templates')
        .select(`
          id,
          title,
          description,
          schema,
          created_at,
          updated_at,
          org_id,
          status
        `)
        .eq('id', data.membership_tiers.form_template_id)
        .single();

      if (!templateError && templateData) {
        // Ensure we only include serializable data
        formTemplate = {
          id: templateData.id,
          title: templateData.title,
          description: templateData.description,
          schema: templateData.schema,
          created_at: templateData.created_at,
          updated_at: templateData.updated_at,
          org_id: templateData.org_id,
          status: templateData.status
        };
      }
    }

    return {
      ...data,
      membership_tier: {
        ...data.membership_tiers,
        form_template_id: data.membership_tiers?.form_template_id,
        form_template: formTemplate,
        member_id_format: data.membership_tiers?.membership_tier_settings?.member_id_format || 'MEM-{YYYY}-{SEQ:3}',
        roles: (data.membership_tiers?.membership_tier_roles || [])
          .filter((tr: MembershipTierRoleWithDeleted) => tr.group_roles && !tr.deleted_at)
          .map((tr: MembershipTierRole) => ({
            id: tr.group_roles.id,
            role_name: tr.group_roles.role_name,
            permissions: tr.group_roles.permissions || []
          }))
      }
    } as IMembershipTierProduct;
  }

  static async getMembershipTiers(groupId: string, isDeleted = false): Promise<IMembershipTierProduct[]> {
    const supabase = await createClient();
    
    const query = supabase
      .from('products')
      .select(`
        *,
        membership_tiers!inner (
          activation_type,
          duration_months,
          form_template_id,
          membership_tier_settings (
            member_id_format
          ),
          membership_tier_roles!left (
            id,
            deleted_at,
            group_roles (
              id,
              role_name,
              permissions
            )
          )
        )
      `)
      .eq('group_id', groupId)
      .eq('type', 'membership_tier');

    // Only include deleted items if explicitly requested
    if (isDeleted) {
      query.eq('is_deleted', true);
    } else {
      // Show items where is_deleted is either null or false
      query.or('is_deleted.eq.false,is_deleted.is.null');
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data) {
      return [];
    }

    // Get form templates for all tiers that have form_template_id
    const formTemplateIds = data
      .map(tier => tier.membership_tiers?.form_template_id)
      .filter(id => id) as string[];

    let formTemplates: Record<string, any> = {};
    if (formTemplateIds.length > 0) {
      const { data: templatesData } = await supabase
        .from('form_templates')
        .select(`
          id,
          title,
          description,
          schema,
          created_at,
          updated_at,
          org_id,
          status
        `)
        .in('id', formTemplateIds);

      if (templatesData) {
        formTemplates = templatesData.reduce((acc, template) => ({
          ...acc,
          [template.id]: {
            id: template.id,
            title: template.title,
            description: template.description,
            schema: template.schema,
            created_at: template.created_at,
            updated_at: template.updated_at,
            org_id: template.org_id,
            status: template.status
          }
        }), {});
      }
    }

    return data.map(tier => ({
      ...tier,
      membership_tier: {
        ...tier.membership_tiers,
        form_template_id: tier.membership_tiers?.form_template_id,
        form_template: tier.membership_tiers?.form_template_id 
          ? formTemplates[tier.membership_tiers.form_template_id]
          : undefined,
        member_id_format: tier.membership_tiers?.membership_tier_settings?.member_id_format || 'MEM-{YYYY}-{SEQ:3}',
        roles: (tier.membership_tiers?.membership_tier_roles || [])
          .filter((tr: MembershipTierRoleWithDeleted) => tr.group_roles && !tr.deleted_at)
          .map((tr: MembershipTierRole) => ({
            id: tr.group_roles.id,
            role_name: tr.group_roles.role_name,
            permissions: tr.group_roles.permissions || []
          }))
      }
    })) as IMembershipTierProduct[];
  }

  static async createMembershipTier(groupId: string, tier: {
    name: string;
    description: string | null;
    price: number;
    currency: string;
    duration_months: number;
    activation_type: string;
    member_id_format: string;
    form_template_id?: string | null;
    roles?: string[];
  }): Promise<IMembershipTierProduct> {
    const supabase = await createClient();
    
    // Start a transaction
    await supabase.rpc('begin_transaction');

    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          type: 'membership_tier',
          name: tier.name,
          description: tier.description,
          price: tier.price,
          currency: tier.currency,
          group_id: groupId,
          is_active: true
        })
        .select()
        .single();

      if (productError) {
        throw productError;
      }

      if (!product) {
        throw new Error('Failed to create product');
      }

      const { data: membershipTier, error: membershipError } = await supabase
        .from('membership_tiers')
        .insert({
          product_id: product.id,
          duration_months: tier.duration_months,
          activation_type: tier.activation_type,
          form_template_id: tier.form_template_id
        })
        .select()
        .single();

      if (membershipError) {
        throw membershipError;
      }

      const { data: tierSettings, error: settingsError } = await supabase
        .from('membership_tier_settings')
        .insert({
          tier_id: membershipTier.product_id,
          member_id_format: tier.member_id_format
        })
        .select()
        .single();

      if (settingsError) {
        throw settingsError;
      }

      // Insert role associations if provided
      if (tier.roles && tier.roles.length > 0) {
        const { error: rolesError } = await supabase
          .from('membership_tier_roles')
          .insert(
            tier.roles.map(roleId => ({
              tier_id: membershipTier.product_id,
              group_role_id: roleId
            }))
          );

        if (rolesError) {
          throw rolesError;
        }
      }

      // Commit transaction
      await supabase.rpc('commit_transaction');

      return {
        ...product,
        membership_tier: {
          ...membershipTier,
          member_id_format: tierSettings.member_id_format
        }
      } as IMembershipTierProduct;
    } catch (error) {
      // Rollback on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  static async updateMembershipTier(id: string, tier: {
    name?: string;
    description?: string | null;
    price?: number;
    currency?: string;
    duration_months?: number;
    activation_type?: string;
    member_id_format?: string;
    form_template_id?: string | null;
    roles?: string[];
  }): Promise<IMembershipTierProduct> {
    const supabase = await createClient();
    
    const { name, description, price, currency, duration_months, activation_type, member_id_format, form_template_id, roles } = tier;

    // Start a transaction
    await supabase.rpc('begin_transaction');

    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .update({
          name,
          description,
          price,
          currency
        })
        .eq('id', id)
        .select()
        .single();

      if (productError) {
        throw productError;
      }

      if (!product) {
        throw new Error('Failed to update product');
      }

      const { data: membershipTier, error: membershipError } = await supabase
        .from('membership_tiers')
        .update({
          duration_months,
          activation_type,
          form_template_id
        })
        .eq('product_id', id)
        .select()
        .single();

      if (membershipError) {
        throw membershipError;
      }

      // Update roles if provided
      if (roles !== undefined) {
        // First, soft delete all existing roles for this tier
        const { error: deleteRolesError } = await supabase
          .from('membership_tier_roles')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: 'system'
          })
          .eq('tier_id', id)
          .is('deleted_at', null);

        if (deleteRolesError) {
          throw deleteRolesError;
        }

        // Then insert new roles if any are provided
        if (roles && roles.length > 0) {
          const { error: insertRolesError } = await supabase
            .from('membership_tier_roles')
            .insert(
              roles.map(roleId => ({
                tier_id: id,
                group_role_id: roleId
              }))
            );

          if (insertRolesError) {
            throw insertRolesError;
          }
        }
      }

      if (member_id_format) {
        const { data: tierSettings, error: settingsError } = await supabase
          .from('membership_tier_settings')
          .update({
            member_id_format
          })
          .eq('tier_id', id)
          .select()
          .single();

        if (settingsError) {
          throw settingsError;
        }

        // Commit transaction
        await supabase.rpc('commit_transaction');

        return {
          ...product,
          membership_tier: {
            ...membershipTier,
            member_id_format: tierSettings.member_id_format,
            roles: roles ? roles.map(roleId => ({ id: roleId })) : undefined
          }
        } as IMembershipTierProduct;
      }

      // Commit transaction
      await supabase.rpc('commit_transaction');

      return {
        ...product,
        membership_tier: {
          ...membershipTier,
          roles: roles ? roles.map(roleId => ({ id: roleId })) : undefined
        }
      } as IMembershipTierProduct;
    } catch (error) {
      // Rollback on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  static async getMembershipTierWithGroup(id: string): Promise<{ group_id: string; exists: boolean }> {
    const supabase = await createClient();
    
    const { data: tier, error } = await supabase
      .from('products')
      .select(`
        group_id,
        membership_tiers!inner (
          product_id
        )
      `)
      .eq('id', id)
      .eq('type', 'membership_tier')
      .single();

    if (error || !tier) {
      return { exists: false, group_id: '' };
    }

    return { exists: true, group_id: tier.group_id };
  }

  static async deleteMembershipTier(id: string): Promise<void> {
    const supabase = await createClient();
    
    // Soft delete by updating is_deleted and deleted_at
    const { error: updateError } = await supabase
      .from('products')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        is_active: false
      })
      .eq('id', id)
      .eq('type', 'membership_tier');

    if (updateError) {
      throw updateError;
    }
  }
} 