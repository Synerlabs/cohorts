import { AffiliateStatusFilterType } from "@/app/(authenticated)/[orgSlug]/(org-pages)/affiliates/_components/affiliate-status-filter";
import { createClient } from '@/lib/utils/supabase/server';
import { Tables } from '@/lib/types/database.types';
import { Camelized } from "humps";
import camelcaseKeys from "camelcase-keys";

// Affiliate interface based on group_organization table
export interface Affiliate extends Camelized<Tables<"group_organization">> {
  childGroup?: Camelized<Tables<"group">>;
  tier?: Camelized<Tables<"membership_tiers">> & {
    product?: Camelized<Tables<"products">>;
  };
}

export interface GetAffiliatesParams {
  id: string;
  status?: AffiliateStatusFilterType;
}

// Get affiliates where the current org is the parent
export async function getOrgAffiliates({ id, status = 'active' }: GetAffiliatesParams): Promise<Affiliate[]> {
  try {
    console.log('Fetching affiliates with params:', { id, status });
    const supabase = await createClient();
    
    // Query the group_organization table where parent_group_id = org.id
    let query = supabase
      .from('group_organization')
      .select(`
        *,
        childGroup:child_group_id(id, name, slug, description, alternate_name),
        tier:tier_id(
          *,
          product:products!membership_tiers_product_id_fkey(id, name, description, price, currency)
        )
      `)
      .eq('parent_group_id', id);
    
    // Filter by status if not showing all
    if (status !== 'all') {
      query = query.eq('is_active', status === 'active');
    }
    
    const { data, error } = await query;
    
    console.log('Raw affiliate data from DB:', data);
    console.log('Any errors:', error);
    
    if (error) {
      console.error('Error fetching affiliates:', error);
      return [];
    }

    // Log property names before camelizing
    if (data && data.length > 0) {
      console.log('Original property names on first item:', Object.keys(data[0]));
      console.log('Original childGroup property:', data[0].childGroup);
      console.log('Original is_active property:', data[0].is_active);
      console.log('Original created_at property:', data[0].created_at);
    } else {
      console.log('No data returned from query');
    }
    
    // Return the camelized data
    const camelizedData = data ? camelcaseKeys(data, { deep: true }) as Affiliate[] : [];
    
    // Log property names after camelizing
    if (camelizedData.length > 0) {
      console.log('Camelized property names on first item:', Object.keys(camelizedData[0]));
      console.log('Camelized childGroup property:', camelizedData[0].childGroup);
      console.log('Camelized isActive property:', camelizedData[0].isActive);
      console.log('Camelized createdAt property:', camelizedData[0].createdAt);
    }
    
    console.log('Camelized affiliate data:', camelizedData);
    return camelizedData;
  } catch (err) {
    console.error('Error in getOrgAffiliates:', err);
    return [];
  }
}

// Toggle affiliate status (activate/deactivate)
export async function toggleAffiliateStatus(affiliateId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // First, get the current status
    const { data: currentData, error: fetchError } = await supabase
      .from('group_organization')
      .select('is_active')
      .eq('id', affiliateId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching affiliate status:', fetchError);
      return false;
    }
    
    // Toggle the status
    const newStatus = !currentData.is_active;
    
    const { error: updateError } = await supabase
      .from('group_organization')
      .update({ 
        is_active: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliateId);
    
    if (updateError) {
      console.error('Error updating affiliate status:', updateError);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error in toggleAffiliateStatus:', err);
    return false;
  }
}

// Delete an affiliate relationship
export async function deleteAffiliate(affiliateId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Delete the affiliate record
    const { error } = await supabase
      .from('group_organization')
      .delete()
      .eq('id', affiliateId);
    
    if (error) {
      console.error('Error deleting affiliate:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error in deleteAffiliate:', err);
    return false;
  }
} 