import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { BillingDetails } from '@/types/database.types';

// Define the type for the form data
export interface BillingDetailsFormData {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * Fetch billing details for a specific order
 */
export async function getBillingDetailsForOrder(orderId: string) {
  const supabase = createClientComponentClient();
  
  const { data, error } = await supabase
    .from('billing_details')
    .select('*')
    .eq('order_id', orderId)
    .limit(1)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - not an error for our purposes
      return null;
    }
    console.error('Error fetching billing details for order:', error);
    throw error;
  }
  
  return data as BillingDetails;
}

/**
 * Fetch default billing details for a user
 */
export async function getDefaultBillingDetails(userId: string) {
  const supabase = createClientComponentClient();
  
  const { data, error } = await supabase
    .from('billing_details')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .is('order_id', null)
    .limit(1)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - not an error for our purposes
      return null;
    }
    console.error('Error fetching default billing details:', error);
    throw error;
  }
  
  return data as BillingDetails;
}

/**
 * Fetch all saved billing details for a user
 */
export async function getAllBillingDetailsForUser(userId: string) {
  const supabase = createClientComponentClient();
  
  const { data, error } = await supabase
    .from('billing_details')
    .select('*')
    .eq('user_id', userId)
    .is('order_id', null)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching all billing details:', error);
    throw error;
  }
  
  return data as BillingDetails[];
}

/**
 * Save new billing details or update existing ones
 */
export async function saveBillingDetails({
  formData,
  userId,
  orderId,
  saveAsDefault = false,
  existingId = null
}: {
  formData: BillingDetailsFormData;
  userId: string;
  orderId?: string;
  saveAsDefault?: boolean;
  existingId?: string | null;
}) {
  const supabase = createClientComponentClient();
  
  // Convert form data to database format
  const dbData = {
    user_id: userId,
    order_id: orderId || null,
    full_name: formData.fullName,
    email: formData.email,
    phone: formData.phone || null,
    company: formData.company || null,
    address: formData.address || null,
    city: formData.city || null,
    state: formData.state || null,
    zip_code: formData.zipCode || null,
    country: formData.country,
    is_default: saveAsDefault && !orderId // Only set as default if not order-specific
  };
  
  // If we're saving a record as default, first clear any existing defaults
  if (saveAsDefault && !orderId) {
    await supabase
      .from('billing_details')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);
  }
  
  // Either insert new or update existing record
  if (existingId) {
    // Update existing record
    const { data, error } = await supabase
      .from('billing_details')
      .update(dbData)
      .eq('id', existingId)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating billing details:', error);
      throw error;
    }
    
    return data as BillingDetails;
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('billing_details')
      .insert(dbData)
      .select()
      .single();
      
    if (error) {
      console.error('Error inserting billing details:', error);
      throw error;
    }
    
    return data as BillingDetails;
  }
}

/**
 * Set an existing billing detail as the default
 */
export async function setDefaultBillingDetail(userId: string, billingDetailId: string) {
  const supabase = createClientComponentClient();
  
  // First clear any existing defaults
  await supabase
    .from('billing_details')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);
  
  // Then set the new default
  const { data, error } = await supabase
    .from('billing_details')
    .update({ is_default: true })
    .eq('id', billingDetailId)
    .eq('user_id', userId)
    .select()
    .single();
    
  if (error) {
    console.error('Error setting default billing detail:', error);
    throw error;
  }
  
  return data as BillingDetails;
}

/**
 * Delete a billing detail
 */
export async function deleteBillingDetail(userId: string, billingDetailId: string) {
  const supabase = createClientComponentClient();
  
  const { error } = await supabase
    .from('billing_details')
    .delete()
    .eq('id', billingDetailId)
    .eq('user_id', userId);
    
  if (error) {
    console.error('Error deleting billing detail:', error);
    throw error;
  }
  
  return true;
}

/**
 * Convert database billing details to form data format
 */
export function convertToFormData(billingDetails: BillingDetails): BillingDetailsFormData {
  return {
    fullName: billingDetails.full_name,
    email: billingDetails.email,
    phone: billingDetails.phone || '',
    company: billingDetails.company || '',
    address: billingDetails.address || '',
    city: billingDetails.city || '',
    state: billingDetails.state || '',
    zipCode: billingDetails.zip_code || '',
    country: billingDetails.country
  };
} 