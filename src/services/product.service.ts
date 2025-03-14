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
        membership_tiers!inner(
          activation_type, duration_months, duration_unit, form_template_id, 
          has_fixed_dates, fixed_start_date, fixed_end_date,
          is_fiscal_period, fiscal_start_month, fiscal_start_day,
          has_monthly_cycle, monthly_start_day, monthly_end_day_type, monthly_end_day,
          type, 
          membership_tier_settings(member_id_format), 
          membership_tier_roles!left(id, deleted_at, group_roles(id, role_name, permissions))
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
        form_template: data.membership_tiers?.form_template_id 
          ? formTemplate
          : undefined,
        member_id_format: data.membership_tiers?.membership_tier_settings?.member_id_format || 'MEM-{YYYY}-{SEQ:3}',
        duration_unit: data.membership_tiers?.duration_unit || 'month',
        has_fixed_dates: data.membership_tiers?.has_fixed_dates || false,
        fixed_start_date: data.membership_tiers?.fixed_start_date || null,
        fixed_end_date: data.membership_tiers?.fixed_end_date || null,
        is_fiscal_period: data.membership_tiers?.is_fiscal_period || false,
        fiscal_start_month: data.membership_tiers?.fiscal_start_month || null,
        fiscal_start_day: data.membership_tiers?.fiscal_start_day || null,
        has_monthly_cycle: data.membership_tiers?.has_monthly_cycle || false,
        monthly_start_day: data.membership_tiers?.monthly_start_day || null,
        monthly_end_day_type: data.membership_tiers?.monthly_end_day_type || 'specific',
        monthly_end_day: data.membership_tiers?.monthly_end_day || null,
        roles: (data.membership_tiers?.membership_tier_roles || [])
          .filter((tr: MembershipTierRoleWithDeleted) => tr.group_roles && !tr.deleted_at)
          .map((tr: MembershipTierRole) => ({
            id: tr.group_roles.id,
            role_name: tr.group_roles.role_name,
            permissions: tr.group_roles.permissions
          }))
      }
    } as IMembershipTierProduct;
  }

  /**
   * Get membership tiers for a group
   * @param groupId - Group ID
   * @param isDeleted - Whether to include deleted items
   */
  static async getMembershipTiers(groupId: string, isDeleted?: boolean): Promise<IMembershipTierProduct[]>;
  /**
   * Get membership tiers for a group with optional filtering
   * @param groupId - Group ID
   * @param isDeleted - Whether to include deleted items
   * @param options - Options for customizing the query
   */
  static async getMembershipTiers(
    groupId: string, 
    isDeleted: boolean, 
    options: { 
      cardsOnly?: boolean;
      tierType?: 'membership' | 'organization';
    }
  ): Promise<IMembershipTierProduct[]>;
  
  // Implementation
  static async getMembershipTiers(
    groupId: string, 
    isDeleted = false, 
    options?: { 
      cardsOnly?: boolean;
      tierType?: 'membership' | 'organization';
    }
  ): Promise<IMembershipTierProduct[]> {
    const supabase = await createClient();
    
    // Determine which columns to select based on options
    let selectQuery: string;
    
    if (options?.cardsOnly) {
      // For cards, we only need basic info
      selectQuery = `
        id, name, description, price, currency, group_id, is_active, created_at, updated_at,
        membership_tiers!inner(
          activation_type, duration_months, duration_unit, type,
          has_fixed_dates, fixed_start_date, fixed_end_date,
          is_fiscal_period, fiscal_start_month, fiscal_start_day,
          has_monthly_cycle, monthly_start_day, monthly_end_day_type, monthly_end_day
        )
      `;
    } else {
      // Full data fetch
      selectQuery = `*,
        membership_tiers!inner(
          activation_type, duration_months, duration_unit, form_template_id, 
          has_fixed_dates, fixed_start_date, fixed_end_date,
          is_fiscal_period, fiscal_start_month, fiscal_start_day,
          has_monthly_cycle, monthly_start_day, monthly_end_day_type, monthly_end_day,
          type, 
          membership_tier_settings(member_id_format), 
          membership_tier_roles!left(id, deleted_at, group_roles(id, role_name, permissions))
        )`;
    }
    
    let query = supabase
      .from('products')
      .select(selectQuery)
      .eq('group_id', groupId)
      .eq('type', 'membership_tier');

    // Handle deleted items filtering
    if (isDeleted) {
      query = query.eq('is_deleted', true);
    } else {
      query = query.or('is_deleted.eq.false,is_deleted.is.null');
    }
    
    // Filter by tier type if specified
    if (options?.tierType) {
      query = query.eq('membership_tiers.type', options.tierType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching membership tiers:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }
    
    // For card-only display, return simplified objects
    if (options?.cardsOnly) {
      return (data as any[]).map((item) => {
        const tierData = item.membership_tiers || {};
        
        return {
          id: item.id || '',
          type: 'membership_tier' as const,
          name: item.name || '',
          description: item.description || '',
          price: typeof item.price === 'number' ? item.price : 0,
          currency: item.currency || 'USD',
          group_id: item.group_id || '',
          is_active: !!item.is_active,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
          form_template_id: '', // Required by interface
          membership_tier: {
            product_id: item.id || '',
            duration_months: typeof tierData.duration_months === 'number' ? tierData.duration_months : 1,
            duration_unit: 'month',
            activation_type: tierData.activation_type || 'automatic',
            type: tierData.type || 'membership',
            
            // Add enhanced duration fields
            has_fixed_dates: Boolean(tierData.has_fixed_dates),
            fixed_start_date: tierData.fixed_start_date || null,
            fixed_end_date: tierData.fixed_end_date || null,
            
            is_fiscal_period: Boolean(tierData.is_fiscal_period),
            fiscal_start_month: tierData.fiscal_start_month || null,
            fiscal_start_day: tierData.fiscal_start_day || null,
            
            has_monthly_cycle: Boolean(tierData.has_monthly_cycle),
            monthly_start_day: tierData.monthly_start_day || null,
            monthly_end_day_type: tierData.monthly_end_day_type as 'specific' || 'specific',
            monthly_end_day: tierData.monthly_end_day || null,
            
            member_id_format: 'MEM-{YYYY}-{SEQ:3}',
            roles: [],
            form_template_id: null,
            form_template: null
          }
        } as IMembershipTierProduct;
      });
    }
    
    // For full data fetches, continue with the existing logic
    try {
      // Get form templates for all tiers that have form_template_id
      const formTemplateIds = Array.isArray(data) ? 
        data
          .filter((tier: any) => tier && typeof tier === 'object')
          .map((tier: any) => tier.membership_tiers?.form_template_id)
          .filter((id: any) => id) as string[] : [];

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

      return (data as any[]).map((tier) => ({
        ...tier,
        membership_tier: {
          ...tier.membership_tiers,
          form_template_id: tier.membership_tiers?.form_template_id,
          form_template: tier.membership_tiers?.form_template_id 
            ? formTemplates[tier.membership_tiers.form_template_id]
            : undefined,
          member_id_format: tier.membership_tiers?.membership_tier_settings?.member_id_format || 'MEM-{YYYY}-{SEQ:3}',
          duration_unit: 'month',
          has_fixed_dates: Boolean(tier.membership_tiers?.has_fixed_dates),
          fixed_start_date: tier.membership_tiers?.fixed_start_date || null,
          fixed_end_date: tier.membership_tiers?.fixed_end_date || null,
          is_fiscal_period: Boolean(tier.membership_tiers?.is_fiscal_period),
          fiscal_start_month: tier.membership_tiers?.fiscal_start_month || null,
          fiscal_start_day: tier.membership_tiers?.fiscal_start_day || null,
          has_monthly_cycle: Boolean(tier.membership_tiers?.has_monthly_cycle),
          monthly_start_day: tier.membership_tiers?.monthly_start_day || null,
          monthly_end_day_type: tier.membership_tiers?.monthly_end_day_type as 'specific' || 'specific',
          monthly_end_day: tier.membership_tiers?.monthly_end_day || null,
          roles: (tier.membership_tiers?.membership_tier_roles || [])
            .filter((tr: MembershipTierRoleWithDeleted) => tr.group_roles && !tr.deleted_at)
            .map((tr: MembershipTierRole) => ({
              id: tr.group_roles.id,
              role_name: tr.group_roles.role_name,
              permissions: tr.group_roles.permissions
            }))
        }
      })) as IMembershipTierProduct[];
    } catch (error) {
      console.error('Error processing membership tiers:', error);
      return [];
    }
  }

  static async createMembershipTier(groupId: string, tier: {
    name: string;
    description: string | null;
    price: number;
    currency: string;
    duration_months: number;
    duration_unit?: 'month' | 'year';
    activation_type: string;
    member_id_format: string;
    form_template_id?: string | null;
    roles?: string[];
    type?: 'membership' | 'organization';
    has_fixed_dates?: boolean;
    fixed_start_date?: string | null;
    fixed_end_date?: string | null;
    is_fiscal_period?: boolean;
    fiscal_start_month?: number | null;
    fiscal_start_day?: number | null;
    has_monthly_cycle?: boolean;
    monthly_start_day?: number | null;
    monthly_end_day_type?: 'specific' | 'last_day';
    monthly_end_day?: number | null;
  }): Promise<IMembershipTierProduct> {
    const supabase = await createClient();
    
    // Start transaction
    await supabase.rpc('begin_transaction');
    
    try {
      // Create product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: tier.name,
          description: tier.description,
          price: tier.price,
          currency: tier.currency,
          type: 'membership_tier',
          group_id: groupId
        })
        .select()
        .single();
      
      if (productError) {
        throw productError;
      }
      
      // Create membership tier
      const { error: tierError } = await supabase
        .from('membership_tiers')
        .insert({
          product_id: product.id,
          duration_months: tier.duration_months,
          duration_unit: tier.duration_unit || 'month',
          activation_type: tier.activation_type,
          form_template_id: tier.form_template_id || null,
          type: tier.type || 'membership',
          
          // Add enhanced duration fields
          has_fixed_dates: tier.has_fixed_dates || false,
          fixed_start_date: tier.fixed_start_date || null,
          fixed_end_date: tier.fixed_end_date || null,
          
          is_fiscal_period: tier.is_fiscal_period || false,
          fiscal_start_month: tier.fiscal_start_month || null,
          fiscal_start_day: tier.fiscal_start_day || null,
          
          has_monthly_cycle: tier.has_monthly_cycle || false,
          monthly_start_day: tier.monthly_start_day || null,
          monthly_end_day_type: tier.monthly_end_day_type || 'specific',
          monthly_end_day: tier.monthly_end_day || null
        });
      
      if (tierError) {
        throw tierError;
      }
      
      // Create membership tier settings
      const { error: settingsError } = await supabase
        .from('membership_tier_settings')
        .insert({
          tier_id: product.id,
          member_id_format: tier.member_id_format
        });
      
      if (settingsError) {
        throw settingsError;
      }
      
      // Add roles if provided
      if (tier.roles && tier.roles.length > 0) {
        const rolesToInsert = tier.roles.map(roleId => ({
          tier_id: product.id,
          group_role_id: roleId
        }));
        
        const { error: rolesError } = await supabase
          .from('membership_tier_roles')
          .insert(rolesToInsert);
        
        if (rolesError) {
          throw rolesError;
        }
      }
      
      // Commit transaction
      await supabase.rpc('commit_transaction');
      
      return {
        ...product,
        membership_tier: {
          product_id: product.id,
          duration_months: tier.duration_months,
          duration_unit: 'month',
          activation_type: tier.activation_type,
          form_template_id: tier.form_template_id || null,
          type: tier.type || 'membership',
          
          // Add enhanced duration fields
          has_fixed_dates: tier.has_fixed_dates || false,
          fixed_start_date: tier.fixed_start_date || null,
          fixed_end_date: tier.fixed_end_date || null,
          
          is_fiscal_period: tier.is_fiscal_period || false,
          fiscal_start_month: tier.fiscal_start_month || null,
          fiscal_start_day: tier.fiscal_start_day || null,
          
          has_monthly_cycle: tier.has_monthly_cycle || false,
          monthly_start_day: tier.monthly_start_day || null,
          monthly_end_day_type: tier.monthly_end_day_type || 'specific',
          monthly_end_day: tier.monthly_end_day || null,
          
          member_id_format: tier.member_id_format,
          roles: tier.roles?.map(id => ({ id })) || []
        }
      } as IMembershipTierProduct;
    } catch (error) {
      // Rollback transaction on error
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
    duration_unit?: 'month' | 'year';
    activation_type?: string;
    member_id_format?: string;
    form_template_id?: string | null;
    rolesToAdd?: string[];
    rolesToRemove?: string[];
    type?: 'membership' | 'organization';
    has_fixed_dates?: boolean;
    fixed_start_date?: string | null;
    fixed_end_date?: string | null;
    is_fiscal_period?: boolean;
    fiscal_start_month?: number | null;
    fiscal_start_day?: number | null;
    has_monthly_cycle?: boolean;
    monthly_start_day?: number | null;
    monthly_end_day_type?: 'specific' | 'last_day';
    monthly_end_day?: number | null;
  }): Promise<IMembershipTierProduct> {
    const supabase = await createClient();
    
    // Start transaction
    await supabase.rpc('begin_transaction');

    try {
      // Update product data
      const productData: Record<string, any> = {};
      if (tier.name) productData.name = tier.name;
      if (tier.description !== undefined) productData.description = tier.description;
      if (tier.price !== undefined) productData.price = tier.price;
      if (tier.currency) productData.currency = tier.currency;

      if (Object.keys(productData).length > 0) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id)
          .select()
          .single();

        if (productError) {
          throw productError;
        }
      }

      // Update membership tier data
      const tierData: Record<string, any> = {};
      if (tier.duration_months !== undefined) tierData.duration_months = tier.duration_months;
      if (tier.activation_type) tierData.activation_type = tier.activation_type;
      if (tier.form_template_id !== undefined) tierData.form_template_id = tier.form_template_id;
      if (tier.type) tierData.type = tier.type;
      if (tier.duration_unit) tierData.duration_unit = tier.duration_unit;
      
      // Add enhanced duration fields
      if (tier.has_fixed_dates !== undefined) tierData.has_fixed_dates = tier.has_fixed_dates;
      if (tier.fixed_start_date !== undefined) tierData.fixed_start_date = tier.fixed_start_date;
      if (tier.fixed_end_date !== undefined) tierData.fixed_end_date = tier.fixed_end_date;
      
      if (tier.is_fiscal_period !== undefined) tierData.is_fiscal_period = tier.is_fiscal_period;
      if (tier.fiscal_start_month !== undefined) tierData.fiscal_start_month = tier.fiscal_start_month;
      if (tier.fiscal_start_day !== undefined) tierData.fiscal_start_day = tier.fiscal_start_day;
      
      if (tier.has_monthly_cycle !== undefined) tierData.has_monthly_cycle = tier.has_monthly_cycle;
      if (tier.monthly_start_day !== undefined) tierData.monthly_start_day = tier.monthly_start_day;
      if (tier.monthly_end_day_type !== undefined) tierData.monthly_end_day_type = tier.monthly_end_day_type;
      if (tier.monthly_end_day !== undefined) tierData.monthly_end_day = tier.monthly_end_day;

      if (Object.keys(tierData).length > 0) {
        const { error: tierError } = await supabase
          .from('membership_tiers')
          .update(tierData)
          .eq('product_id', id);
        
        if (tierError) {
          throw tierError;
        }
      }

      // Update member_id_format if provided
      if (tier.member_id_format) {
        const { data: tierSettings, error: settingsError } = await supabase
          .from('membership_tier_settings')
          .update({
            member_id_format: tier.member_id_format
          })
          .eq('tier_id', id)
          .select()
          .single();

        if (settingsError) {
          throw settingsError;
        }

        // Commit transaction
        await supabase.rpc('commit_transaction');

        // Get the current roles after all changes
        const { data: currentRoles } = await supabase
          .from('membership_tier_roles')
          .select('group_role_id')
          .eq('tier_id', id)
          .is('deleted_at', null);

        return {
          ...productData,
          membership_tier: {
            ...tierData,
            member_id_format: tierSettings.member_id_format,
            roles: currentRoles?.map(role => ({ id: role.group_role_id })) || []
          }
        } as IMembershipTierProduct;
      }

      // Commit transaction
      await supabase.rpc('commit_transaction');

      // Get the current roles after all changes
      const { data: currentRoles } = await supabase
        .from('membership_tier_roles')
        .select('group_role_id')
        .eq('tier_id', id)
        .is('deleted_at', null);

      return {
        ...productData,
        membership_tier: {
          ...tierData,
          roles: currentRoles?.map(role => ({ id: role.group_role_id })) || []
        }
      } as IMembershipTierProduct;
    } catch (error) {
      // Rollback transaction on error
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

  /**
   * Get membership tiers optimized for card display
   * @param groupId Group ID
   * @param isDeleted Whether to include deleted items
   * @param type Optional tier type filter
   */
  static async getMembershipTiersForCards(
    groupId: string, 
    isDeleted = false, 
    type?: 'membership' | 'organization'
  ): Promise<IMembershipTierProduct[]> {
    const supabase = await createClient();
    
    let query = supabase
      .from('products')
      .select(`
        id, name, description, price, currency, group_id, is_active, created_at, updated_at,
        membership_tiers!inner(
          activation_type, duration_months, duration_unit, type,
          has_fixed_dates, fixed_start_date, fixed_end_date,
          is_fiscal_period, fiscal_start_month, fiscal_start_day,
          has_monthly_cycle, monthly_start_day, monthly_end_day_type, monthly_end_day
        )
      `)
      .eq('group_id', groupId)
      .eq('type', 'membership_tier');

    // Handle deleted items filtering
    if (isDeleted) {
      query = query.eq('is_deleted', true);
    } else {
      query = query.or('is_deleted.eq.false,is_deleted.is.null');
    }
    
    // Filter by tier type if specified
    if (type) {
      query = query.eq('membership_tiers.type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching membership tiers:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }
    
    // For card-only display, return simplified objects
    return data.map((item: any) => {
      const tierData = item.membership_tiers || {};
      
      return {
        id: item.id || '',
        type: 'membership_tier' as const,
        name: item.name || '',
        description: item.description || '',
        price: typeof item.price === 'number' ? item.price : 0,
        currency: item.currency || 'USD',
        group_id: item.group_id || '',
        is_active: !!item.is_active,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
        form_template_id: '', // Required by interface
        membership_tier: {
          product_id: item.id || '',
          duration_months: typeof tierData.duration_months === 'number' ? tierData.duration_months : 1,
          duration_unit: tierData.duration_unit || 'month',
          activation_type: tierData.activation_type || 'automatic',
          type: tierData.type || 'membership',
          
          // Add enhanced duration fields
          has_fixed_dates: tierData.has_fixed_dates || false,
          fixed_start_date: tierData.fixed_start_date || null,
          fixed_end_date: tierData.fixed_end_date || null,
          
          is_fiscal_period: tierData.is_fiscal_period || false,
          fiscal_start_month: tierData.fiscal_start_month || null,
          fiscal_start_day: tierData.fiscal_start_day || null,
          
          has_monthly_cycle: tierData.has_monthly_cycle || false,
          monthly_start_day: tierData.monthly_start_day || null,
          monthly_end_day_type: tierData.monthly_end_day_type || 'specific',
          monthly_end_day: tierData.monthly_end_day || null,
          
          member_id_format: 'MEM-{YYYY}-{SEQ:3}',
          roles: [],
          form_template_id: null,
          form_template: null
        }
      } as unknown as IMembershipTierProduct;
    });
  }
} 