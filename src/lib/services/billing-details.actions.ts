'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { BillingDetails } from '@/types/database.types';
import { BillingDetailsFormData } from './billing-details.service';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';

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
     
    // If the user wants to save for future orders (saveAsDefault is true) AND we're editing an order-specific record,
    // we need to also create a non-order-specific copy for future use
    if (saveAsDefault && orderId) {
      console.log('[SERVER] User wants to save billing details for future orders');
      
      // Create a reusable copy without the order_id
      const reusableCopy = {
        ...dbData,
        order_id: null,
        is_default: true // Set this copy as default
      };
      
      // First clear any existing defaults
      console.log('[SERVER] Clearing existing defaults for user:', userId);
      const { error: clearError } = await supabase
        .from('billing_details')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);
        
      if (clearError) {
        console.error('[SERVER] Error clearing existing default billing details:', clearError);
        throw clearError;
      }
      
      // Insert the reusable copy
      console.log('[SERVER] Creating reusable copy of billing details');
      const { error: insertError } = await supabase
        .from('billing_details')
        .insert(reusableCopy);
        
      if (insertError) {
        console.error('[SERVER] Error creating reusable copy of billing details:', insertError);
        throw insertError;
      }
      
      console.log('[SERVER] Successfully created reusable copy of billing details');
    } 
    // If we're saving a non-order-specific record as default, first clear any existing defaults
    else if (saveAsDefault && !orderId) {
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
      // Check if the record exists first
      console.log('[SERVER] Checking if billing detail with ID exists:', existingId);
      const { data: existingRecord, error: checkError } = await supabase
        .from('billing_details')
        .select('id')
        .eq('id', existingId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error if no record
        
      if (checkError) {
        console.error('[SERVER] Error checking billing details existence:', checkError);
        throw checkError;
      }
      
      if (!existingRecord) {
        console.log('[SERVER] Billing detail with ID not found, creating new record instead:', existingId);
        // If ID doesn't exist, fall through to insert logic
      } else {
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
      }
    }
    
    // Insert new record (if existingId was null or the record wasn't found)
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
  } catch (error) {
    console.error('[SERVER] Error in saveBillingDetailsAction:', error);
    throw error;
  }
}

export async function deleteBillingDetailAction(
  prevState: { success: boolean } | null,
  formData: FormData
): Promise<{ success: boolean; message?: string }> {
  const billingDetailId = formData.get('billingDetailId') as string;
  const userId = formData.get('userId') as string;
  
  console.log('Delete billing detail action triggered', { billingDetailId, userId });
  
  if (!billingDetailId || !userId) {
    return { 
      success: false, 
      message: 'Missing required fields' 
    };
  }
  
  try {
    const supabase = await createServiceRoleClient();
    
    // Delete the billing detail
    const { error } = await supabase
      .from('billing_details')
      .delete()
      .eq('id', billingDetailId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error deleting billing detail:', error);
      return { 
        success: false, 
        message: `Failed to delete billing detail: ${error.message}` 
      };
    }
    
    return { 
      success: true, 
      message: 'Billing detail deleted successfully' 
    };
  } catch (error) {
    console.error('Error in deleteBillingDetailAction:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
} 