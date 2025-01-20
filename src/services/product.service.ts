import { Database } from '@/lib/types/database.types';
import { IMembershipTierProduct } from '@/lib/types/product';
import { createClient } from '@/lib/utils/supabase/server';

export class ProductService {
  static async getMembershipTier(id: string): Promise<IMembershipTierProduct> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        membership_tiers (
          activation_type,
          duration_months
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

    console.log('Raw membership_tiers:', data.membership_tiers);
    console.log('Type of membership_tiers:', typeof data.membership_tiers);
    console.log('Is array:', Array.isArray(data.membership_tiers));

    return {
      ...data,
      membership_tier: data.membership_tiers
    } as IMembershipTierProduct;
  }

  static async getMembershipTiers(groupId: string): Promise<IMembershipTierProduct[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        membership_tiers (
          activation_type,
          duration_months
        )
      `)
      .eq('group_id', groupId)
      .eq('type', 'membership_tier');

    if (error) {
      throw error;
    }

    if (!data) {
      return [];
    }

    console.log('Raw membership_tiers:', data[0]?.membership_tiers);
    console.log('Type of membership_tiers:', typeof data[0]?.membership_tiers);
    console.log('Is array:', Array.isArray(data[0]?.membership_tiers));

    return data.map(tier => ({
      ...tier,
      membership_tier: tier.membership_tiers
    })) as IMembershipTierProduct[];
  }

  static async createMembershipTier(groupId: string, tier: {
    name: string;
    description: string | null;
    price: number;
    currency: string;
    duration_months: number;
    activation_type: string;
  }): Promise<IMembershipTierProduct> {
    const supabase = await createClient();
    
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
        activation_type: tier.activation_type
      })
      .select()
      .single();

    if (membershipError) {
      throw membershipError;
    }

    return {
      ...product,
      membership_tier: membershipTier
    } as IMembershipTierProduct;
  }

  static async updateMembershipTier(id: string, tier: {
    name?: string;
    description?: string | null;
    price?: number;
    currency?: string;
    duration_months?: number;
    activation_type?: string;
  }): Promise<IMembershipTierProduct> {
    const supabase = await createClient();
    
    const { name, description, price, currency, duration_months, activation_type } = tier;

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
        activation_type
      })
      .eq('product_id', id)
      .select()
      .single();

    if (membershipError) {
      throw membershipError;
    }

    return {
      ...product,
      membership_tier: membershipTier
    } as IMembershipTierProduct;
  }
} 