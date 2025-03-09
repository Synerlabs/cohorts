'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { BillingDetails } from '@/types/database.types';
import { BillingDetailsFormData } from './billing-details.service';

/**
 * Server action to save billing details
 */
export async function saveBillingDetailsAction({
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
  console.log('[SERVER] Saving billing details:', { 
    userId, 
    orderId, 
    saveAsDefault, 
    existingId,
    formData // Log the full form data for debugging
  });
  
  try {
    // Use server component client with cookies
    const supabase = createServerComponentClient({ cookies });
    console.log('[SERVER] Supabase server client created');
    
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
    
    console.log('[SERVER] Billing details to save:', dbData);
    
    // If we're saving a record as default, first clear any existing defaults
    if (saveAsDefault && !orderId) {
      console.log('[SERVER] Clearing existing defaults for user:', userId);
      const { data: clearData, error: clearError } = await supabase
        .from('billing_details')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);
      
      console.log('[SERVER] Clear existing defaults result:', { data: clearData, error: clearError });
        
      if (clearError) {
        console.error('[SERVER] Error clearing existing default billing details:', clearError);
        throw clearError;
      }
      
      console.log('[SERVER] Default flag set on new billing details:', dbData.is_default);
    }
    
    // Either insert new or update existing record
    if (existingId) {
      // Update existing record
      console.log('[SERVER] Updating existing billing details with ID:', existingId);
      const { data, error } = await supabase
        .from('billing_details')
        .update(dbData)
        .eq('id', existingId)
        .select()
        .single();
        
      if (error) {
        console.error('[SERVER] Error updating billing details:', error);
        throw error;
      }
      
      console.log('[SERVER] Billing details updated successfully:', data);
      return data as BillingDetails;
    } else {
      // Insert new record
      console.log('[SERVER] Inserting new billing details');
      const { data, error } = await supabase
        .from('billing_details')
        .insert(dbData)
        .select()
        .single();
        
      if (error) {
        console.error('[SERVER] Error inserting billing details:', error);
        throw error;
      }
      
      console.log('[SERVER] Billing details inserted successfully:', data);
      return data as BillingDetails;
    }
  } catch (error) {
    console.error('[SERVER] Error in saveBillingDetailsAction:', error);
    throw error;
  }
} 