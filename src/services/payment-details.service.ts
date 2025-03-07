import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { MembershipTier } from "@/types/membership";

/**
 * Service for handling payment details and membership information
 */
export class PaymentDetailsService {
  /**
   * Fetches membership tier details related to an order
   * @param orderId The ID of the order
   * @returns The membership tier details or null if not found
   */
  static async getMembershipDetailsForOrder(orderId: string): Promise<MembershipTier | null> {
    const serviceClient = await createServiceRoleClient();
    let membershipDetails: MembershipTier | null = null;
    
    try {
      console.log(`Fetching membership details for order: ${orderId}`);
      
      // First get suborders with their product IDs
      const { data: suborders, error: suborderError } = await serviceClient
        .from('suborders')
        .select('product_id')
        .eq('order_id', orderId)
        .not('product_id', 'is', null);
      
      if (suborderError) {
        console.error('Error fetching suborders:', suborderError);
      } else if (suborders && suborders.length > 0) {
        console.log(`Found ${suborders.length} suborders with product IDs`);
        
        // Extract unique product IDs
        const productIds = [...new Set(suborders.map(so => so.product_id))];
        
        if (productIds.length > 0) {
          console.log('Product IDs from suborders:', productIds);
          
          // Get membership tiers associated with these products 
          // Include all relevant fields based on database schema
          const { data: tiers, error: tiersError } = await serviceClient
            .from('membership_tiers')
            .select(`
              product_id,
              duration_months,
              duration_unit,
              activation_type,
              has_fixed_dates,
              fixed_start_date,
              fixed_end_date,
              is_fiscal_period,
              fiscal_start_month,
              fiscal_start_day,
              type,
              products!membership_tiers_product_id_fkey(
                id,
                name,
                description,
                price,
                currency
              ),
              membership_tier_settings!membership_tier_settings_tier_id_fkey(
                id,
                tier_id,
                member_id_format
              )
            `)
            .in('product_id', productIds)
            .order('duration_months', { ascending: false })
            .limit(1);
          
          if (tiersError) {
            console.error('Error fetching membership tiers by product IDs:', tiersError);
          } else if (tiers && tiers.length > 0) {
            console.log('Found membership tier for product:', tiers[0]);
            membershipDetails = this.processMembershipTier(tiers[0]);
          } else {
            console.log('No membership tiers found for the product IDs');
          }
        }
      } else {
        console.log('No suborders found, checking direct product_id on order');
        
        // Check if order has a direct product_id reference
        const { data: order, error: orderError } = await serviceClient
          .from('orders')
          .select('product_id')
          .eq('id', orderId)
          .single();
        
        if (!orderError && order && order.product_id) {
          console.log('Order has direct product_id:', order.product_id);
          
          // Get membership tier by product ID with all relevant fields
          const { data: tier, error: tierError } = await serviceClient
            .from('membership_tiers')
            .select(`
              product_id,
              duration_months,
              duration_unit,
              activation_type,
              has_fixed_dates,
              fixed_start_date,
              fixed_end_date,
              is_fiscal_period,
              fiscal_start_month,
              fiscal_start_day,
              type,
              products!membership_tiers_product_id_fkey(
                id,
                name,
                description,
                price,
                currency
              ),
              membership_tier_settings!membership_tier_settings_tier_id_fkey(
                id,
                tier_id,
                key,
                value,
                member_id_format
              )
            `)
            .eq('product_id', order.product_id)
            .single();
          
          if (!tierError && tier) {
            console.log('Found membership tier by direct product_id:', tier);
            membershipDetails = this.processMembershipTier(tier);
          } else {
            console.log('No membership tier found for direct product_id');
          }
        }
      }
      
      // If still no membership details, try via application
      if (!membershipDetails) {
        console.log('Trying to find membership tier via application');
        
        // Get application linked to the order 
        const { data: application, error: applicationError } = await serviceClient
          .from('applications')
          .select('product_id, tier_id')
          .eq('order_id', orderId)
          .single();
        
        if (!applicationError && application) {
          const productId = application.product_id || application.tier_id;
          if (productId) {
            console.log('Found application with product/tier ID:', productId);
            
            // Get membership tier by product ID with all relevant fields
            const { data: tier, error: tierError } = await serviceClient
              .from('membership_tiers')
              .select(`
                product_id,
                duration_months,
                duration_unit,
                activation_type,
                has_fixed_dates,
                fixed_start_date,
                fixed_end_date,
                is_fiscal_period,
                fiscal_start_month,
                fiscal_start_day,
                type,
                products!membership_tiers_product_id_fkey(
                  id,
                  name,
                  description,
                  price,
                  currency
                ),
                membership_tier_settings!membership_tier_settings_tier_id_fkey(
                  id,
                  tier_id,
                  key,
                  value,
                  member_id_format
                )
              `)
              .eq('product_id', productId)
              .single();
            
            if (!tierError && tier) {
              console.log('Found membership tier via application:', tier);
              membershipDetails = this.processMembershipTier(tier);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error during membership details retrieval:', err);
    }
    
    return membershipDetails;
  }
  
  /**
   * Process a membership tier object to ensure it has the correct format
   * and extract complex duration information from settings
   * @param tier Raw membership tier data from database
   * @returns Processed membership tier data
   */
  static processMembershipTier(tier: any): MembershipTier {
    // Extract product information (name, description, price, etc.)
    const product = tier.products || {};
    
    // Determine the interval based on tier settings
    let interval = '';
    
    // Try to determine interval from direct fields first
    if (tier.duration_unit) {
      if (tier.duration_months === 1 && tier.duration_unit === 'month') {
        interval = 'month';
      } else if (tier.duration_months === 12 && tier.duration_unit === 'month') {
        interval = 'year';
      } else if (tier.duration_unit === 'year') {
        interval = tier.duration_months === 1 ? 'year' : `${tier.duration_months} years`;
      } else if (tier.duration_unit === 'month') {
        interval = tier.duration_months === 1 ? 'month' : `${tier.duration_months} months`;
      }
    } else if (tier.has_fixed_dates) {
      // Fixed dates interval
      interval = 'fixed period';
    } else if (tier.is_fiscal_period) {
      // Fiscal period
      interval = 'fiscal period';
    } else if (tier.duration_months) {
      // Old style duration_months with no unit specified
      if (tier.duration_months === 0 || tier.duration_months === -1) {
        interval = 'lifetime';
      } else if (tier.duration_months === 1) {
        interval = 'month';
      } else if (tier.duration_months === 12) {
        interval = 'year';
      } else {
        interval = `${tier.duration_months} months`;
      }
    }
    
    // Check membership_tier_settings for more specific interval/duration info
    const settings = tier.membership_tier_settings || [];
    if (Array.isArray(settings) && settings.length > 0) {
      // Look for specific keys in settings
      const durationSetting = settings.find(s => s.key === 'duration' || s.key === 'interval');
      const durationTypeSetting = settings.find(s => s.key === 'duration_type' || s.key === 'interval_type');
      
      // Apply settings if we found relevant ones
      if (durationSetting && durationSetting.value) {
        if (durationSetting.value === '0' || durationSetting.value === 0 || 
            durationSetting.value === '-1' || durationSetting.value === -1) {
          interval = 'lifetime';
        } else if (durationTypeSetting && durationTypeSetting.value) {
          // If we have both duration and type
          const type = durationTypeSetting.value.toString().toLowerCase();
          if (type === 'month' || type === 'monthly') {
            interval = durationSetting.value === 1 ? 'month' : `${durationSetting.value} months`;
          } else if (type === 'year' || type === 'yearly' || type === 'annual') {
            interval = durationSetting.value === 1 ? 'year' : `${durationSetting.value} years`;
          } else {
            interval = `${durationSetting.value} ${type}${durationSetting.value !== 1 ? 's' : ''}`;
          }
        }
      }
    }
    
    // Parse benefits if needed
    let benefits: string[] = [];
    if (tier.benefits) {
      if (typeof tier.benefits === 'string') {
        try {
          const parsedBenefits = JSON.parse(tier.benefits);
          if (Array.isArray(parsedBenefits)) {
            benefits = parsedBenefits;
          }
        } catch (e) {
          console.error('Error parsing benefits:', e);
        }
      } else if (Array.isArray(tier.benefits)) {
        benefits = tier.benefits;
      }
    }
    
    // Build final membership tier object
    return {
      id: tier.product_id || product.id,
      name: product.name || 'Membership',
      description: product.description || '',
      price: product.price || tier.price || 0,
      currency: product.currency || tier.currency || 'USD',
      interval: interval || 'membership',
      benefits: benefits,
      membership_tier_settings: settings
    };
  }
  
  /**
   * Parse benefits from a membership tier
   * @param membershipDetails Membership tier details
   * @returns Array of benefit strings
   */
  static parseBenefits(membershipDetails: MembershipTier | null): string[] {
    if (!membershipDetails?.benefits) return [];
    
    if (typeof membershipDetails.benefits === 'string') {
      try {
        const parsedBenefits = JSON.parse(membershipDetails.benefits);
        if (Array.isArray(parsedBenefits)) {
          return parsedBenefits;
        }
      } catch (e) {
        console.error('Error parsing benefits JSON:', e);
      }
      return [];
    } else if (Array.isArray(membershipDetails.benefits)) {
      return membershipDetails.benefits;
    }
    
    return [];
  }
} 