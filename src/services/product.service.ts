import { createClient } from "@/lib/utils/supabase/server";
import { IProduct, IMembershipTierProduct } from "@/lib/types/product";

export class ProductService {
  static async getMembershipTier(id: string): Promise<IMembershipTierProduct | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        type,
        name,
        description,
        price,
        currency,
        group_id,
        is_active,
        created_at,
        updated_at,
        membership_tier:membership_tiers!inner(
          duration_months,
          activation_type
        )
      `)
      .eq('id', id)
      .eq('type', 'membership_tier')
      .single();

    if (error) throw error;
    if (!data) return null;

    console.log('Raw data from getMembershipTier:', data);
    console.log('membership_tier type:', typeof data.membership_tier);
    console.log('membership_tier isArray:', Array.isArray(data.membership_tier));
    console.log('membership_tier value:', data.membership_tier);
    
    // Transform the data to match IMembershipTierProduct
    return {
      ...data,
      type: 'membership_tier' as const,
      membership_tier: data.membership_tier
    };
  }

  static async getMembershipTiers(groupId: string): Promise<IMembershipTierProduct[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        type,
        name,
        description,
        price,
        currency,
        group_id,
        is_active,
        created_at,
        updated_at,
        membership_tier:membership_tiers!inner(
          duration_months,
          activation_type
        )
      `)
      .eq('group_id', groupId)
      .eq('type', 'membership_tier')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    console.log('Raw data from getMembershipTiers:', data);
    if (data.length > 0) {
      console.log('First membership_tier type:', typeof data[0].membership_tier);
      console.log('First membership_tier isArray:', Array.isArray(data[0].membership_tier));
      console.log('First membership_tier value:', data[0].membership_tier);
    }
    
    // Transform the data to match IMembershipTierProduct[]
    return data.map(product => ({
      ...product,
      type: 'membership_tier' as const,
      membership_tier: product.membership_tier
    }));
  }

  static async createMembershipTier(
    groupId: string,
    data: {
      name: string;
      description?: string;
      price: number;
      currency: string;
      duration_months: number;
      activation_type: string;
    }
  ): Promise<IMembershipTierProduct> {
    const supabase = await createClient();

    // First create the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        type: 'membership_tier',
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency,
        group_id: groupId,
        is_active: true
      })
      .select()
      .single();

    if (productError) throw productError;

    // Then create the membership tier
    const { data: membershipTier, error: tierError } = await supabase
      .from('membership_tiers')
      .insert({
        product_id: product.id,
        duration_months: data.duration_months,
        activation_type: data.activation_type
      })
      .select()
      .single();

    if (tierError) throw tierError;

    return {
      ...product,
      membership_tier: membershipTier
    } as IMembershipTierProduct;
  }

  static async updateMembershipTier(
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      currency?: string;
      duration_months?: number;
      activation_type?: string;
      is_active?: boolean;
    }
  ): Promise<IMembershipTierProduct> {
    const supabase = await createClient();

    // Update product fields
    const productUpdate: any = {};
    if (data.name) productUpdate.name = data.name;
    if (data.description !== undefined) productUpdate.description = data.description;
    if (data.price !== undefined) productUpdate.price = data.price;
    if (data.currency) productUpdate.currency = data.currency;
    if (data.is_active !== undefined) productUpdate.is_active = data.is_active;

    if (Object.keys(productUpdate).length > 0) {
      const { error: productError } = await supabase
        .from('products')
        .update(productUpdate)
        .eq('id', id);

      if (productError) throw productError;
    }

    // Update membership tier fields
    const tierUpdate: any = {};
    if (data.duration_months) tierUpdate.duration_months = data.duration_months;
    if (data.activation_type) tierUpdate.activation_type = data.activation_type;

    if (Object.keys(tierUpdate).length > 0) {
      const { error: tierError } = await supabase
        .from('membership_tiers')
        .update(tierUpdate)
        .eq('product_id', id);

      if (tierError) throw tierError;
    }

    // Get updated data
    return await this.getMembershipTier(id) as IMembershipTierProduct;
  }
} 