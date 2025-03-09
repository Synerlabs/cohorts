'use client';

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

// Import the server action for saving billing details
import { saveBillingDetailsAction } from './billing-details.actions';

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
  console.log('Fetching default billing details for user:', userId);
  const supabase = createClientComponentClient();
  
  // First, let's check how many billing details this user has (regardless of is_default)
  const { data: allData, error: allError } = await supabase
    .from('billing_details')
    .select('*')
    .eq('user_id', userId);
    
  if (allError) {
    console.error('Error fetching all billing details:', allError);
  } else {
    console.log(`User has ${allData?.length || 0} total billing details:`, 
      allData?.map(d => ({
        id: d.id, 
        is_default: d.is_default, 
        order_id: d.order_id,
        name: d.full_name
      }))
    );
  }
  
  // Now get the default one
  const { data, error } = await supabase
    .from('billing_details')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .limit(1)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - not an error for our purposes
      console.log('No default billing details found for user:', userId);
      console.log('SQL query used:', 
        `SELECT * FROM billing_details 
         WHERE user_id = '${userId}' 
         AND is_default = true 
         LIMIT 1`
      );
      return null;
    }
    console.error('Error fetching default billing details:', error);
    throw error;
  }
  
  console.log('Found default billing details:', data);
  return data as BillingDetails;
}

/**
 * Fetch all saved billing details for a user
 */
export async function getAllBillingDetailsForUser(userId: string) {
  const supabase = createClientComponentClient();
  
  try {
    // Get ALL billing details for the user, regardless of order_id
    const { data, error } = await supabase
      .from('billing_details')
      .select('*')
      .eq('user_id', userId)
      // Removed the .is('order_id', null) filter to get ALL billing details
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching billing details:', error);
      throw error;
    }
    
    return data as BillingDetails[];
  } catch (err) {
    console.error('Unexpected error in getAllBillingDetailsForUser:', err);
    throw err;
  }
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
  console.log('Calling saveBillingDetailsAction from client');
  
  try {
    // Call the server action instead of using the client directly
    const result = await saveBillingDetailsAction({
      formData,
      userId,
      orderId,
      saveAsDefault,
      existingId
    });
    
    console.log('Server action returned result:', result);
    return result as BillingDetails;
  } catch (error) {
    console.error('Error in saveBillingDetails client wrapper:', error);
    throw error;
  }
}

/**
 * Set an existing billing detail as the default
 */
export async function setDefaultBillingDetail(userId: string, billingDetailId: string) {
  console.log('Setting default billing detail:', { userId, billingDetailId });
  const supabase = createClientComponentClient();
  
  // First check if the billing detail exists
  const { data: checkData, error: checkError } = await supabase
    .from('billing_details')
    .select('*')
    .eq('id', billingDetailId)
    .eq('user_id', userId)
    .single();
    
  if (checkError) {
    console.error('Error checking billing detail before setting as default:', checkError);
    throw checkError;
  }
  
  console.log('Clearing existing defaults for user:', userId);
  
  // First clear any existing defaults
  const { error: clearError } = await supabase
    .from('billing_details')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);
    
  if (clearError) {
    console.error('Error clearing existing default billing details:', clearError);
    throw clearError;
  }
  
  console.log('Setting new default billing detail, id:', billingDetailId);
  
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
  
  console.log('Successfully set default billing detail:', data);
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

/**
 * Fix default billing details inconsistencies
 * This can be used to ensure only one default billing detail exists for a user
 */
export async function fixDefaultBillingDetails(userId: string) {
  console.log('Fixing default billing details for user:', userId);
  const supabase = createClientComponentClient();
  
  // First, get all billing details for this user
  const { data, error } = await supabase
    .from('billing_details')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching billing details for fixing defaults:', error);
    throw error;
  }
  
  console.log(`Found ${data?.length || 0} billing details for user`);
  
  if (!data || data.length === 0) {
    console.log('No billing details to fix for this user');
    return null;
  }
  
  // First, clear all defaults
  const { error: clearError } = await supabase
    .from('billing_details')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);
    
  if (clearError) {
    console.error('Error clearing all defaults during fix:', clearError);
    throw clearError;
  }
  
  // Now set the most recently updated one as default
  const mostRecent = data[0];
  console.log('Setting most recent billing detail as default:', mostRecent.id);
  
  const { data: updatedData, error: updateError } = await supabase
    .from('billing_details')
    .update({ is_default: true })
    .eq('id', mostRecent.id)
    .select()
    .single();
    
  if (updateError) {
    console.error('Error setting new default during fix:', updateError);
    throw updateError;
  }
  
  console.log('Successfully fixed default billing details. New default:', updatedData);
  return updatedData as BillingDetails;
} 